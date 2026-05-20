import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { loadConfig } from "./config/env.js";
import { createClock } from "./domain/clock.js";
import { createIdFactory } from "./domain/ids.js";
import { createMemoryStore } from "./repositories/memory-store.js";
import { createCreativeProjectService } from "./creative-projects/creative-project.service.js";
import { createGenerationRequestService } from "./generation-requests/generation-request.service.js";
import { createPromptCompilerService } from "./prompt-compiler/prompt-compiler.service.js";
import { createVideoJobService } from "./video-jobs/video-job.service.js";
import { createGeneratedVideoService } from "./generated-videos/generated-video.service.js";
import { createAdPublicationService } from "./ad-publications/ad-publication.service.js";
import { createMetricsService } from "./metrics/metrics.service.js";
import { createIterationSuggestionService } from "./iteration-suggestions/iteration-suggestion.service.js";
import { createDemoReplayService } from "./demo/demo-replay.service.js";
import { createAuthService } from "./auth/auth.service.js";
import { cloneDemoFixture, defaultDemoFixturePath } from "./demo/demo-fixture.loader.js";
import { mapError } from "./http/errors/error-mapper.js";
import {
  resolveRequestContext,
  resolveRequestId
} from "./http/middleware/request-context.js";
import { invalidRequest, notFound } from "./http/errors/api-error.js";
import { createOpenApiSpec, createSwaggerHtml } from "./http/openapi.js";

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type,x-tenant-id,x-request-id");
  response.end(JSON.stringify(body));
}

function sendText(response, status, body, contentType) {
  response.statusCode = status;
  response.setHeader("content-type", contentType);
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type,x-tenant-id,x-request-id");
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
  const fixturePath = options.demoFixturePath ?? defaultDemoFixturePath;
  const fixture = options.fixture ?? cloneDemoFixture(fixturePath);
  const store = options.store ?? createMemoryStore({ fixture, config, clock });

  const creativeProjects = createCreativeProjectService({ store, ids, clock });
  const promptCompiler = createPromptCompilerService({ store, ids, clock, config });
  const generationRequests = createGenerationRequestService({
    store,
    ids,
    clock,
    config,
    creativeProjects,
    promptCompiler
  });
  const videoJobs = createVideoJobService({ store });
  const generatedVideos = createGeneratedVideoService({ store, clock });
  const adPublications = createAdPublicationService({ store, ids, clock, config });
  const metrics = createMetricsService({ store, ids, clock, config });
  const iterationSuggestions = createIterationSuggestionService({ store, ids, clock });
  const demoReplay = createDemoReplayService({ fixturePath });
  const auth = createAuthService({ store, ids, clock, config });
  const openApiSpec = createOpenApiSpec(config);
  const swaggerHtml = createSwaggerHtml();

  function context(headers, requestId) {
    return resolveRequestContext({
      headers,
      config,
      store,
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

      if (method === "GET" && pathname === "/demo/fallback") {
        return { status: 200, body: demoReplay.getFallbackReplay() };
      }

      // Auth endpoints (no tenant required)
      if (method === "POST" && pathname === "/auth/register") {
        return { status: 201, body: auth.register(body) };
      }

      if (method === "POST" && pathname === "/auth/login") {
        return { status: 200, body: auth.login(body) };
      }

      if (method === "POST" && pathname === "/creative-projects") {
        return {
          status: 201,
          body: creativeProjects.create(context(headers, requestId), body)
        };
      }

      const creativeProjectMatch = matchPath(pathname, /^\/creative-projects\/([^/]+)$/);
      if (method === "GET" && creativeProjectMatch) {
        return {
          status: 200,
          body: creativeProjects.getBundle(context(headers, requestId), creativeProjectMatch[0])
        };
      }

      if (method === "POST" && pathname === "/generation-requests") {
        return {
          status: 202,
          body: generationRequests.create(context(headers, requestId), body)
        };
      }

      const videoJobMatch = matchPath(pathname, /^\/video-jobs\/([^/]+)$/);
      if (method === "GET" && videoJobMatch) {
        return {
          status: 200,
          body: videoJobs.get(context(headers, requestId), videoJobMatch[0])
        };
      }

      const generatedVideoSelectMatch = matchPath(pathname, /^\/generated-videos\/([^/]+)\/select$/);
      if (method === "POST" && generatedVideoSelectMatch) {
        return {
          status: 200,
          body: generatedVideos.select(context(headers, requestId), generatedVideoSelectMatch[0], body)
        };
      }

      if (method === "POST" && pathname === "/ad-publications") {
        return {
          status: 201,
          body: adPublications.create(context(headers, requestId), body)
        };
      }

      const metricSyncMatch = matchPath(pathname, /^\/ad-publications\/([^/]+)\/metrics\/sync$/);
      if (method === "POST" && metricSyncMatch) {
        return {
          status: 201,
          body: metrics.sync(context(headers, requestId), metricSyncMatch[0], body)
        };
      }

      if (method === "POST" && pathname === "/creative-iteration-suggestions") {
        return {
          status: 201,
          body: iterationSuggestions.create(context(headers, requestId), body)
        };
      }

      throw notFound("NOT_FOUND", "Route was not found.");
    } catch (error) {
      return mapError(error, requestId);
    }
  }

  async function handler(request, response) {
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
      sendResult(response, result);
    } catch (error) {
      const requestId = resolveRequestId(request.headers, `req-${randomUUID()}`);
      const result = mapError(error, requestId);
      sendJson(response, result.status, result.body);
    }
  }

  return {
    config,
    store,
    dispatch,
    handler,
    createServer() {
      return createServer(handler);
    }
  };
}
