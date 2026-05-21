import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { loadConfig } from "./config/env.js";
import { createClock } from "./domain/clock.js";
import { createIdFactory } from "./domain/ids.js";
import { initDatabase } from "./db/index.js";
import { createCreativeProjectService } from "./creative-projects/creative-project.service.js";
import { createGenerationRequestService } from "./generation-requests/generation-request.service.js";
import { createPromptCompilerService } from "./prompt-compiler/prompt-compiler.service.js";
import { createVideoJobService } from "./video-jobs/video-job.service.js";
import { createGeneratedVideoService } from "./generated-videos/generated-video.service.js";
import { createAdPublicationService } from "./ad-publications/ad-publication.service.js";
import { createMetricsService } from "./metrics/metrics.service.js";
import { createIterationSuggestionService } from "./iteration-suggestions/iteration-suggestion.service.js";
import { createAuthService } from "./auth/auth.service.js";
import { createKpiSummaryService } from "./dashboard/kpi-summary.service.js";
import { createRecentActivitiesService } from "./dashboard/recent-activities.service.js";
import { createTenantService } from "./tenant/tenant.service.js";
import { mapError } from "./http/errors/error-mapper.js";
import {
  resolveRequestContext,
  resolveRequestId
} from "./http/middleware/request-context.js";
import { createSecurityMiddlewareStack } from "./http/middleware/security.js";
import { invalidRequest, notFound } from "./http/errors/api-error.js";
import { createOpenApiSpec, createSwaggerHtml } from "./http/openapi.js";
import { createLogger } from "./logger/index.js";

const log = createLogger("request");
const UPLOAD_DIRECTORY = new URL("../uploads/", import.meta.url);
const UPLOAD_CONTENT_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif"
};

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type,x-tenant-id,x-request-id,authorization");
  response.end(JSON.stringify(body));
}

function sendText(response, status, body, contentType) {
  response.statusCode = status;
  response.setHeader("content-type", contentType);
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type,x-tenant-id,x-request-id,authorization");
  response.end(body);
}

function sendBinary(response, status, body, contentType) {
  response.statusCode = status;
  response.setHeader("content-type", contentType);
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type,x-tenant-id,x-request-id,authorization");
  response.end(body);
}

function getUploadContentType(fileName) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return UPLOAD_CONTENT_TYPES[extension] || "application/octet-stream";
}

function sendResult(response, result) {
  if (result.contentType?.startsWith("text/html")) {
    sendText(response, result.status, result.body, result.contentType);
    return;
  }

  if (result.body instanceof Uint8Array) {
    sendBinary(response, result.status, result.body, result.contentType || "application/octet-stream");
    return;
  }

  // Apply security headers from context if available
  const headers = {
    ...result.headers,
    ...(result._context?.securityHeaders || {}),
    ...(result._context?.corsHeaders || {})
  };

  if (Object.keys(headers).length > 0) {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    for (const [key, value] of Object.entries(headers)) {
      response.setHeader(key, value);
    }
  }

  sendJson(response, result.status, result.body);
}

async function readRequestBody(request) {
  if (!["POST", "PUT", "PATCH"].includes(request.method ?? "")) {
    return null;
  }

  const contentType = request.headers["content-type"] || "";

  // Skip JSON parsing for multipart/form-data
  if (contentType.includes("multipart/form-data")) {
    return null; // Let the route handler handle the raw request
  }

  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 1_000_000) {
      throw invalidRequest("Request body is too large.");
    }
  }

  if (raw.trim() === "") {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw invalidRequest("Request body must be valid JSON.");
  }
}

function matchPath(pathname, pattern) {
  const match = pathname.match(pattern);
  return match ? match.slice(1).map(decodeURIComponent) : null;
}

async function getDbHealth() {
  try {
    const start = Date.now();
    const result = await query("SELECT 1 as health", [], { check: "health" });
    const duration = Date.now() - start;
    return {
      healthy: true,
      duration_ms: duration,
      pool_size: getPool().totalCount,
      idle_connections: getPool().idleCount,
      waiting_clients: getPool().waitingCount
    };
  } catch (err) {
    return {
      healthy: false,
      error: err.message
    };
  }
}

function healthBody(config) {
  const selectedVideoReadiness = config.videoProviderReadiness[config.defaultVideoProvider];
  const degraded = config.mode === "live" && config.defaultVideoProvider !== "mock" && !selectedVideoReadiness?.ready;

  return {
    status: degraded ? "degraded" : "ok",
    mode: degraded ? "degraded" : config.mode,
    version: config.version,
    video_provider_readiness: config.videoProviderReadiness,
    ad_platform_readiness: config.adPlatformReadiness
  };
}

export function createApp(options = {}) {
  const config = loadConfig(options.env ?? process.env);
  const clock = options.clock ?? createClock();
  const ids = options.ids ?? createIdFactory();

  // Initialize database connection
  initDatabase();

  const creativeProjects = createCreativeProjectService({ ids, clock });
  const promptCompiler = createPromptCompilerService({ ids, clock, config });
  const generationRequests = createGenerationRequestService({
    ids,
    clock,
    config,
    creativeProjects,
    promptCompiler
  });
  const videoJobs = createVideoJobService({ ids, clock, config });
  const generatedVideos = createGeneratedVideoService({ clock });
  const adPublications = createAdPublicationService({ ids, clock, config });
  const metrics = createMetricsService({ ids, clock, config });
  const iterationSuggestions = createIterationSuggestionService({ ids, clock });
  const auth = createAuthService({ ids, clock, config });
  const kpiSummary = createKpiSummaryService({ clock });
  const recentActivities = createRecentActivitiesService({ clock });
  const tenantService = createTenantService({ clock });
  const openApiSpec = createOpenApiSpec(config);
  const swaggerHtml = createSwaggerHtml();

  // Initialize security middleware stack
  const security = createSecurityMiddlewareStack(config);

  async function context(headers, requestId) {
    return resolveRequestContext({
      headers,
      config,
      requestId,
      tenantRequired: true
    });
  }

  async function dispatch({ method = "GET", path = "/", headers = {}, body = null, rawRequest = null }) {
    const requestId = resolveRequestId(headers, `req-${randomUUID()}`);
    const url = new URL(path, "http://localhost");
    const pathname = url.pathname;

    // Create fresh context for each request
    const contextObj = { requestId };

    // Apply security middleware
    const rawReq = rawRequest || { method, headers, url: path };
    const securityResult = await security.apply(contextObj, rawReq);
    if (securityResult) {
      return securityResult;
    }

    try {
      if (method === "OPTIONS") {
        return { status: 204, body: null };
      }

      if (method === "GET" && pathname === "/openapi.json") {
        return { status: 200, body: openApiSpec };
      }

      if (method === "GET" && pathname === "/docs") {
        return {
          status: 200,
          body: swaggerHtml,
          contentType: "text/html; charset=utf-8"
        };
      }

      if (method === "GET" && pathname === "/health") {
        return { status: 200, body: healthBody(config) };
      }

      const uploadMatch = matchPath(pathname, /^\/uploads\/([A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp|gif))$/);
      if (method === "GET" && uploadMatch) {
        const fileName = uploadMatch[0];
        try {
          return {
            status: 200,
            body: await readFile(new URL(fileName, UPLOAD_DIRECTORY)),
            contentType: getUploadContentType(fileName)
          };
        } catch {
          return { status: 404, body: { error: "NOT_FOUND", message: "Upload was not found." } };
        }
      }

      if (method === "GET" && pathname === "/health/ready") {
        const dbHealth = await getDbHealth();
        const status = dbHealth.healthy ? "ok" : "degraded";
        return {
          status: dbHealth.healthy ? 200 : 503,
          body: {
            status,
            checks: { database: dbHealth }
          }
        };
      }

      // Auth endpoints (no tenant required)
      if (method === "POST" && pathname === "/auth/register") {
        return { status: 201, body: await auth.register(body) };
      }

      if (method === "POST" && pathname === "/auth/login") {
        return { status: 200, body: await auth.login(body) };
      }

      // Dashboard endpoints
      if (method === "GET" && pathname === "/dashboard/kpi-summary") {
        return {
          status: 200,
          body: await kpiSummary.getSummary(await context(headers, requestId))
        };
      }

      const recentActivitiesMatch = matchPath(pathname, /^\/dashboard\/recent-activities$/);
      if (method === "GET" && recentActivitiesMatch) {
        const urlParams = new URL(path, "http://localhost").searchParams;
        const limit = urlParams.get("limit") ? parseInt(urlParams.get("limit")) : 10;
        return {
          status: 200,
          body: await recentActivities.getActivities(await context(headers, requestId), { limit })
        };
      }

      // Tenant endpoints
      if (method === "GET" && pathname === "/tenant/credits") {
        return {
          status: 200,
          body: await tenantService.getCredits(await context(headers, requestId))
        };
      }

      // Creative projects endpoints
      if (method === "POST" && pathname === "/creative-projects") {
        return {
          status: 201,
          body: await creativeProjects.create(await context(headers, requestId), body),
          headers: contextObj.securityHeaders || {}
        };
      }

      if (method === "GET" && pathname === "/creative-projects") {
        return {
          status: 200,
          body: await creativeProjects.listProjects(await context(headers, requestId))
        };
      }

      // Source assets upload (multipart form data)
      if (method === "POST" && pathname === "/source-assets/upload") {
        return {
          status: 201,
          body: await creativeProjects.uploadSourceAsset(await context(headers, requestId), rawRequest)
        };
      }

      const creativeProjectMatch = matchPath(pathname, /^\/creative-projects\/([^/]+)$/);
      if (method === "GET" && creativeProjectMatch) {
        return {
          status: 200,
          body: await creativeProjects.getBundle(await context(headers, requestId), creativeProjectMatch[0])
        };
      }

      const creativeProjectMetricsMatch = matchPath(pathname, /^\/creative-projects\/([^/]+)\/metrics$/);
      if (method === "GET" && creativeProjectMetricsMatch) {
        return {
          status: 200,
          body: await creativeProjects.getMetrics(await context(headers, requestId), creativeProjectMetricsMatch[0])
        };
      }

      // Generation request endpoints
      if (method === "POST" && pathname === "/generation-requests") {
        return {
          status: 202,
          body: await generationRequests.create(await context(headers, requestId), body)
        };
      }

      if (method === "POST" && pathname === "/generation-requests/estimate-cost") {
        return {
          status: 200,
          body: await generationRequests.estimateCost(await context(headers, requestId), body)
        };
      }

      // Video job endpoints
      const videoJobMatch = matchPath(pathname, /^\/video-jobs\/([^/]+)$/);
      if (method === "GET" && videoJobMatch) {
        return {
          status: 200,
          body: await videoJobs.get(await context(headers, requestId), videoJobMatch[0])
        };
      }

      const videoJobFullMatch = matchPath(pathname, /^\/video-jobs\/([^/]+)\/full$/);
      if (method === "GET" && videoJobFullMatch) {
        return {
          status: 200,
          body: await videoJobs.getFull(await context(headers, requestId), videoJobFullMatch[0])
        };
      }

      // Generated video endpoints
      const generatedVideoSelectMatch = matchPath(pathname, /^\/generated-videos\/([^/]+)\/select$/);
      if (method === "POST" && generatedVideoSelectMatch) {
        return {
          status: 200,
          body: await generatedVideos.select(await context(headers, requestId), generatedVideoSelectMatch[0], body)
        };
      }

      // Ad publication endpoints
      if (method === "POST" && pathname === "/ad-publications") {
        return {
          status: 201,
          body: await adPublications.create(await context(headers, requestId), body)
        };
      }

      const metricSyncMatch = matchPath(pathname, /^\/ad-publications\/([^/]+)\/metrics\/sync$/);
      if (method === "POST" && metricSyncMatch) {
        return {
          status: 201,
          body: await metrics.sync(await context(headers, requestId), metricSyncMatch[0], body)
        };
      }

      // Iteration suggestions endpoint
      if (method === "POST" && pathname === "/creative-iteration-suggestions") {
        return {
          status: 201,
          body: await iterationSuggestions.create(await context(headers, requestId), body)
        };
      }

      throw notFound("NOT_FOUND", "Route was not found.");
    } catch (error) {
      return mapError(error, requestId);
    }
  }

  async function handler(request, response) {
    const requestId = resolveRequestId(request.headers, `req-${randomUUID()}`);
    const startTime = Date.now();

    try {
      if (request.method === "OPTIONS") {
        sendJson(response, 204, null);
        return;
      }

      const body = await readRequestBody(request);

      // Pass raw request for multipart routes
      const isMultipart = (request.headers["content-type"] || "").includes("multipart/form-data");

      const result = await dispatch({
        method: request.method,
        path: request.url,
        headers: request.headers,
        body,
        rawRequest: isMultipart ? request : null
      });

      const duration = Date.now() - startTime;
      const method = request.method;
      const url = request.url;

      log.info(`${method} ${url}`, {
        request_id: requestId,
        status: result.status,
        duration_ms: duration,
        ip: request.headers["x-forwarded-for"] || request.socket.remoteAddress,
      });

      sendResult(response, result);
    } catch (error) {
      const duration = Date.now() - startTime;
      log.error(`${request.method} ${request.url} failed`, {
        request_id: requestId,
        duration_ms: duration,
        error: error.message,
      });

      const result = mapError(error, requestId);
      sendJson(response, result.status, result.body);
    }
  }

  return {
    config,
    dispatch,
    handler,
    createServer() {
      return createServer(handler);
    }
  };
}
