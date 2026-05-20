import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
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
import { createDemoReplayService } from "./demo/demo-replay.service.js";
import { mapError } from "./http/errors/error-mapper.js";
import {
  resolveRequestContext,
  resolveRequestId
} from "./http/middleware/request-context.js";
import { invalidRequest, notFound } from "./http/errors/api-error.js";
import { createOpenApiSpec, createSwaggerHtml } from "./http/openapi.js";
import { createLogger } from "./logger/index.js";

const log = createLogger("request");

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

function sendResult(response, result) {
  if (result.contentType?.startsWith("text/html")) {
    sendText(response, result.status, result.body, result.contentType);
    return;
  }
  sendJson(response, result.status, result.body);
}

async function readRequestBody(request) {
  if (!["POST", "PUT", "PATCH"].includes(request.method ?? "")) {
    return null;
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
  const videoJobs = createVideoJobService({});
  const generatedVideos = createGeneratedVideoService({ clock });
  const adPublications = createAdPublicationService({ ids, clock, config });
  const metrics = createMetricsService({ ids, clock, config });
  const iterationSuggestions = createIterationSuggestionService({ ids, clock });
  const auth = createAuthService({ ids, clock, config });
  const demoReplay = createDemoReplayService();
  const openApiSpec = createOpenApiSpec(config);
  const swaggerHtml = createSwaggerHtml();

  async function context(headers, requestId) {
    return resolveRequestContext({
      headers,
      config,
      requestId,
      tenantRequired: true
    });
  }

  async function dispatch({ method = "GET", path = "/", headers = {}, body = null }) {
    const requestId = resolveRequestId(headers, `req-${randomUUID()}`);
    const url = new URL(path, "http://localhost");
    const pathname = url.pathname;

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

      // Demo fallback endpoint (no tenant required)
      if (method === "GET" && pathname === "/demo/fallback") {
        const demoContext = {
          tenant_id: demoReplay.getDemoTenantId(),
          user_id: null,
          mode: "demo",
          fallback_enabled: true
        };
        return { status: 200, body: demoReplay.getFallback(demoContext) };
      }

      // Auth endpoints (no tenant required)
      if (method === "POST" && pathname === "/auth/register") {
        return { status: 201, body: await auth.register(body) };
      }

      if (method === "POST" && pathname === "/auth/login") {
        return { status: 200, body: await auth.login(body) };
      }

      if (method === "POST" && pathname === "/creative-projects") {
        return {
          status: 201,
          body: await creativeProjects.create(context(headers, requestId), body)
        };
      }

      if (method === "GET" && pathname === "/creative-projects") {
        return {
          status: 200,
          body: await creativeProjects.listProjects(context(headers, requestId))
        };
      }

      const creativeProjectMatch = matchPath(pathname, /^\/creative-projects\/([^/]+)$/);
      if (method === "GET" && creativeProjectMatch) {
        return {
          status: 200,
          body: await creativeProjects.getBundle(context(headers, requestId), creativeProjectMatch[0])
        };
      }

      if (method === "POST" && pathname === "/generation-requests") {
        return {
          status: 202,
          body: await generationRequests.create(context(headers, requestId), body)
        };
      }

      const videoJobMatch = matchPath(pathname, /^\/video-jobs\/([^/]+)$/);
      if (method === "GET" && videoJobMatch) {
        return {
          status: 200,
          body: await videoJobs.get(context(headers, requestId), videoJobMatch[0])
        };
      }

      const generatedVideoSelectMatch = matchPath(pathname, /^\/generated-videos\/([^/]+)\/select$/);
      if (method === "POST" && generatedVideoSelectMatch) {
        return {
          status: 200,
          body: await generatedVideos.select(context(headers, requestId), generatedVideoSelectMatch[0], body)
        };
      }

      if (method === "POST" && pathname === "/ad-publications") {
        return {
          status: 201,
          body: await adPublications.create(context(headers, requestId), body)
        };
      }

      const metricSyncMatch = matchPath(pathname, /^\/ad-publications\/([^/]+)\/metrics\/sync$/);
      if (method === "POST" && metricSyncMatch) {
        return {
          status: 201,
          body: await metrics.sync(context(headers, requestId), metricSyncMatch[0], body)
        };
      }

      if (method === "POST" && pathname === "/creative-iteration-suggestions") {
        return {
          status: 201,
          body: await iterationSuggestions.create(context(headers, requestId), body)
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
      const result = await dispatch({
        method: request.method,
        path: request.url,
        headers: request.headers,
        body
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
