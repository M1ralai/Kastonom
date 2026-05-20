import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { createApp } from "../src/app.js";
import { createClock } from "../src/domain/clock.js";
import { createIdFactory } from "../src/domain/ids.js";

const fixedClock = () => createClock({ fixed: "2026-01-01T00:00:00.000Z" });

function app(env = {}) {
  return createApp({
    env,
    clock: fixedClock(),
    ids: createIdFactory()
  });
}

function projectInput(overrides = {}) {
  return {
    name: "Demo project",
    creative_subject: {
      subject_type: "product",
      name: "Test Mug",
      description: "A user-provided ceramic mug description.",
      landing_url: "https://example.com/test-mug",
      price: null,
      currency: null,
      allowed_claims: ["Ceramic mug"],
      forbidden_claims: ["No discount claim", "No guarantee claim"],
      unknown_fields: ["price", "stock", "discount"],
      source: "user_input"
    },
    source_assets: [
      {
        asset_type: "image",
        source: "external_url",
        url: "https://example.com/mug.png",
        metadata: {
          label: "user supplied reference"
        }
      }
    ],
    ...overrides
  };
}

function generationInput(project, provider = "mock") {
  return {
    project_id: project.creative_project.id,
    source_asset_ids: [project.source_assets[0].id],
    provider,
    objective: "awareness",
    platform: "reels",
    duration_seconds: 15,
    aspect_ratio: "9:16",
    language: "Turkish",
    call_to_action: "Detayları gör"
  };
}

async function createProject(api, headers = {}) {
  const response = await api.dispatch({
    method: "POST",
    path: "/creative-projects",
    headers,
    body: projectInput()
  });
  assert.equal(response.status, 201);
  return response.body;
}

async function createGeneratedVideo(api, headers = {}) {
  const project = await createProject(api, headers);
  const generation = await api.dispatch({
    method: "POST",
    path: "/generation-requests",
    headers,
    body: generationInput(project)
  });
  assert.equal(generation.status, 202);
  return { project, generation: generation.body };
}

test("GET /health returns safe mock readiness without secrets", async () => {
  const api = app({ POLLO_API_KEY: "super-secret-provider-key" });
  const response = await api.dispatch({ method: "GET", path: "/health" });

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
  assert.equal(response.body.mode, "mock");
  assert.equal(response.body.video_provider_readiness.mock.ready, true);
  assert.equal(JSON.stringify(response.body).includes("super-secret-provider-key"), false);
});

test("Swagger docs and OpenAPI spec exist and include every backend route", async () => {
  const api = app();
  const openApi = await api.dispatch({ method: "GET", path: "/openapi.json" });
  const docs = await api.dispatch({ method: "GET", path: "/docs" });

  assert.equal(openApi.status, 200);
  assert.equal(openApi.body.openapi, "3.1.0");
  assert.equal(openApi.body.info.title, "Kastonom Backend API");
  assert.equal(docs.status, 200);
  assert.equal(docs.contentType, "text/html; charset=utf-8");
  assert.match(docs.body, /SwaggerUIBundle/);
  assert.match(docs.body, /\/openapi\.json/);

  const expectedPaths = [
    "/openapi.json",
    "/docs",
    "/health",
    "/creative-projects",
    "/creative-projects/{id}",
    "/generation-requests",
    "/video-jobs/{id}",
    "/generated-videos/{id}/select",
    "/ad-publications",
    "/ad-publications/{id}/metrics/sync",
    "/creative-iteration-suggestions",
    "/demo/fallback"
  ];

  for (const path of expectedPaths) {
    assert.ok(openApi.body.paths[path], `${path} is missing from OpenAPI paths`);
  }
});

test("invalid mode fails during app construction", () => {
  assert.throws(
    () => app({ KASTONOM_MODE: "chaos" }),
    /KASTONOM_MODE must be one of/
  );
});

test("live mode reports degraded health when selected provider credentials are missing", async () => {
  const api = app({
    KASTONOM_MODE: "live",
    KASTONOM_DEFAULT_VIDEO_PROVIDER: "pollo",
    KASTONOM_FALLBACK_ENABLED: "false"
  });
  const response = await api.dispatch({ method: "GET", path: "/health" });

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "degraded");
  assert.equal(response.body.mode, "degraded");
  assert.deepEqual(response.body.video_provider_readiness.pollo.missing, [
    "POLLO_API_KEY",
    "POLLO_API_BASE_URL"
  ]);
});

test("creative project API stores user facts and unknown fields without invention", async () => {
  const api = app();
  const created = await createProject(api);

  assert.equal(created.creative_subject.name, "Test Mug");
  assert.deepEqual(created.creative_subject.unknown_fields, ["price", "stock", "discount"]);
  assert.equal(created.creative_subject.price, null);
  assert.equal(created.fallback_reason, null);

  const fetched = await api.dispatch({
    method: "GET",
    path: `/creative-projects/${created.creative_project.id}`
  });
  assert.equal(fetched.status, 200);
  assert.equal(fetched.body.creative_project.id, created.creative_project.id);
  assert.equal(fetched.body.source_assets.length, 1);
});

test("tenant guard defaults to demo tenant in mock mode but fails closed in live mode", async () => {
  const live = app({ KASTONOM_MODE: "live" });
  const missingTenant = await live.dispatch({
    method: "POST",
    path: "/creative-projects",
    body: projectInput()
  });

  assert.equal(missingTenant.status, 400);
  assert.equal(missingTenant.body.error, "INVALID_TENANT");

  const mock = app();
  const demoTenant = await mock.dispatch({
    method: "POST",
    path: "/creative-projects",
    body: projectInput()
  });
  assert.equal(demoTenant.status, 201);
  assert.equal(demoTenant.body.creative_project.tenant_id, "demo-tenant");
});

test("tenant-scoped project lookup does not reveal cross-tenant data", async () => {
  const api = app();
  const created = await createProject(api, { "x-tenant-id": "demo-tenant" });
  const crossTenant = await api.dispatch({
    method: "GET",
    path: `/creative-projects/${created.creative_project.id}`,
    headers: { "x-tenant-id": "other-tenant" }
  });

  assert.equal(crossTenant.status, 404);
  assert.equal(crossTenant.body.error, "CREATIVE_PROJECT_NOT_FOUND");
});

test("full mock flow creates prompt payload, job, generated video, polling response, and selection", async () => {
  const api = app();
  const { project, generation } = await createGeneratedVideo(api);

  assert.equal(generation.prompt_payload.provider, "mock");
  assert.equal(generation.prompt_payload.is_mock, true);
  assert.match(generation.prompt_payload.prompt_text, /Test Mug/);
  assert.match(generation.prompt_payload.negative_prompt, /No discount claim/);
  assert.equal(generation.video_job.status, "completed");
  assert.equal(generation.generated_videos[0].is_mock, true);

  const polled = await api.dispatch({
    method: "GET",
    path: `/video-jobs/${generation.video_job.id}`
  });
  assert.equal(polled.status, 200);
  assert.equal(polled.body.generated_videos.length, 1);

  const selected = await api.dispatch({
    method: "POST",
    path: `/generated-videos/${generation.generated_videos[0].id}/select`,
    body: { project_id: project.creative_project.id }
  });
  assert.equal(selected.status, 200);
  assert.equal(selected.body.generated_video.is_selected, true);
  assert.equal(
    selected.body.creative_project.selected_generated_video_id,
    generation.generated_videos[0].id
  );
});

test("live provider without credentials fails closed when fallback is disabled", async () => {
  const api = app({
    KASTONOM_MODE: "live",
    KASTONOM_DEFAULT_VIDEO_PROVIDER: "pollo",
    KASTONOM_FALLBACK_ENABLED: "false"
  });
  const headers = { "x-tenant-id": "demo-tenant" };
  const project = await createProject(api, headers);
  const response = await api.dispatch({
    method: "POST",
    path: "/generation-requests",
    headers,
    body: generationInput(project, "pollo")
  });

  assert.equal(response.status, 500);
  assert.equal(response.body.error, "PROVIDER_CONFIG_MISSING");
  assert.equal(response.body.fallback_available, false);
});

test("live provider can fall back to labeled mock only when fallback is enabled", async () => {
  const api = app({
    KASTONOM_MODE: "live",
    KASTONOM_DEFAULT_VIDEO_PROVIDER: "pollo",
    KASTONOM_FALLBACK_ENABLED: "true"
  });
  const headers = { "x-tenant-id": "demo-tenant" };
  const project = await createProject(api, headers);
  const response = await api.dispatch({
    method: "POST",
    path: "/generation-requests",
    headers,
    body: generationInput(project, "pollo")
  });

  assert.equal(response.status, 202);
  assert.equal(response.body.video_job.provider, "mock");
  assert.equal(response.body.video_job.is_mock, true);
  assert.equal(response.body.fallback_reason, "provider_config_missing_fallback_to_mock");
});

test("ad publication requires explicit user confirmation", async () => {
  const api = app();
  const { project, generation } = await createGeneratedVideo(api);
  await api.dispatch({
    method: "POST",
    path: `/generated-videos/${generation.generated_videos[0].id}/select`,
    body: { project_id: project.creative_project.id }
  });

  const response = await api.dispatch({
    method: "POST",
    path: "/ad-publications",
    body: {
      project_id: project.creative_project.id,
      generated_video_id: generation.generated_videos[0].id,
      platform: "meta_ads",
      user_confirmed_publish: false
    }
  });

  assert.equal(response.status, 422);
  assert.equal(response.body.error, "INVALID_REQUEST");
});

test("mock publication succeeds only after selected video and remains labeled through mock ids", async () => {
  const api = app();
  const { project, generation } = await createGeneratedVideo(api);
  await api.dispatch({
    method: "POST",
    path: `/generated-videos/${generation.generated_videos[0].id}/select`,
    body: { project_id: project.creative_project.id }
  });

  const response = await api.dispatch({
    method: "POST",
    path: "/ad-publications",
    body: {
      project_id: project.creative_project.id,
      generated_video_id: generation.generated_videos[0].id,
      platform: "meta_ads",
      destination_url: "https://example.com/test-mug",
      user_confirmed_publish: true
    }
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.ad_publication.status, "published");
  assert.match(response.body.ad_publication.external_campaign_id, /^mock-campaign-/);
  assert.equal(response.body.fallback_reason, "mock_ad_publication");
});

test("live ad publication fails closed when platform config is missing", async () => {
  const api = app({ KASTONOM_MODE: "live", KASTONOM_FALLBACK_ENABLED: "false" });
  const headers = { "x-tenant-id": "demo-tenant" };
  const project = await createProject(api, headers);
  const generation = await api.dispatch({
    method: "POST",
    path: "/generation-requests",
    headers,
    body: generationInput(project, "mock")
  });
  await api.dispatch({
    method: "POST",
    path: `/generated-videos/${generation.body.generated_videos[0].id}/select`,
    headers,
    body: { project_id: project.creative_project.id }
  });

  const response = await api.dispatch({
    method: "POST",
    path: "/ad-publications",
    headers,
    body: {
      project_id: project.creative_project.id,
      generated_video_id: generation.body.generated_videos[0].id,
      platform: "meta_ads",
      user_confirmed_publish: true
    }
  });

  assert.equal(response.status, 500);
  assert.equal(response.body.error, "AD_PLATFORM_CONFIG_MISSING");
});

test("metrics sync stores only supplied metrics and does not invent missing values", async () => {
  const api = app();
  const response = await api.dispatch({
    method: "POST",
    path: "/ad-publications/demo-ad-publication/metrics/sync",
    body: {
      source: "mock",
      date_start: "2026-02-01",
      date_end: "2026-02-07",
      metrics: {
        impressions: 100,
        currency: "TRY"
      }
    }
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.metrics_snapshot.impressions, 100);
  assert.equal(response.body.metrics_snapshot.currency, "TRY");
  assert.equal(Object.hasOwn(response.body.metrics_snapshot, "clicks"), false);
  assert.equal(Object.hasOwn(response.body.metrics_snapshot, "spend"), false);
});

test("iteration suggestion endpoint stores externally supplied payload only", async () => {
  const api = app();
  const response = await api.dispatch({
    method: "POST",
    path: "/creative-iteration-suggestions",
    body: {
      project_id: "demo-project",
      ad_publication_id: "demo-ad-publication",
      metrics_snapshot_id: "demo-metrics-snapshot",
      base_generation_request_id: "demo-generation-request",
      suggestion_payload: {
        reason: "External suggestion supplied by test.",
        metric_drivers: ["mock.ctr"],
        suggested_changes: {
          opening: "Use a clearer first frame."
        },
        confidence: "low",
        fallback_notes: ["external_payload"]
      }
    }
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.creative_iteration_suggestion.reason, "External suggestion supplied by test.");
  assert.deepEqual(response.body.creative_iteration_suggestion.metric_drivers, ["mock.ctr"]);
});

test("demo fallback response is deterministic and complete", async () => {
  const api = app();
  const first = await api.dispatch({ method: "GET", path: "/demo/fallback" });
  const second = await api.dispatch({ method: "GET", path: "/demo/fallback" });

  assert.equal(first.status, 200);
  assert.deepEqual(first.body, second.body);
  assert.equal(first.body.fallback_reason, "demo_fallback");
  assert.equal(first.body.video_job.is_mock, true);
  assert.equal(first.body.generated_videos[0].is_mock, true);
});

test("missing demo fallback fixture returns stable failure", async () => {
  const api = createApp({
    env: {},
    clock: fixedClock(),
    ids: createIdFactory(),
    demoFixturePath: resolve("backend/fixtures/does-not-exist.json"),
    fixture: {
      tenants: [
        {
          id: "demo-tenant",
          name: "Demo",
          mode: "demo",
          status: "active",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z"
        }
      ]
    }
  });
  const response = await api.dispatch({ method: "GET", path: "/demo/fallback" });

  assert.equal(response.status, 500);
  assert.equal(response.body.error, "DEMO_FALLBACK_UNAVAILABLE");
});

test("backend workstream does not create MCP runtime files", () => {
  assert.equal(existsSync(resolve("src/mcp")), false);
});

test("fixtures and source do not contain obvious secret assignments", () => {
  const roots = [resolve("src"), resolve("fixtures")];
  const findings = [];

  function walk(path) {
    for (const entry of readdirSync(path)) {
      const next = resolve(path, entry);
      if (statSync(next).isDirectory()) {
        walk(next);
        continue;
      }
      const content = readFileSync(next, "utf8");
      if (/(api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret)\s*[:=]\s*["'][^"']+["']/i.test(content)) {
        findings.push(next);
      }
    }
  }

  for (const root of roots) {
    walk(root);
  }

  assert.deepEqual(findings, []);
});
