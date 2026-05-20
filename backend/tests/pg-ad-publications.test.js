import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { createClock } from "../src/domain/clock.js";
import { createIdFactory } from "../src/domain/ids.js";
import { initTestDatabase, cleanupTestDatabase, getTestPool, seedDemoTenant } from "./helpers/test-db.js";

const fixedClock = () => createClock({ fixed: "2026-01-01T00:00:00.000Z" });

process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/kastonom_test";

function app(env = {}) {
  return createApp({
    env: {
      ...env,
      DATABASE_URL: process.env.TEST_DATABASE_URL
    },
    clock: fixedClock(),
    ids: createIdFactory()
  });
}

function projectInput(overrides = {}) {
  return {
    name: "Ad Test Project",
    creative_subject: {
      subject_type: "product",
      name: "Test Ad Product",
      allowed_claims: ["Test claim"],
      forbidden_claims: [],
      unknown_fields: [],
      source: "user_input"
    },
    source_assets: [
      {
        asset_type: "image",
        source: "external_url",
        url: "https://example.com/ad-product.png"
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
    language: "Turkish"
  };
}

// Test suite setup
test.before(async () => {
  console.log("Initializing test database for ad publications...");
  await initTestDatabase();
});

test.after(async () => {
  console.log("Cleaning up test database...");
  await cleanupTestDatabase();
});

test.beforeEach(async () => {
  const pool = await getTestPool();
  await cleanupTestDatabase();
  await seedDemoTenant(pool);
});

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

async function selectVideo(api, headers, project, videoId) {
  const response = await api.dispatch({
    method: "POST",
    path: `/generated-videos/${videoId}/select`,
    headers,
    body: { project_id: project.creative_project.id }
  });
  assert.equal(response.status, 200);
  return response.body;
}

test("ad publication requires explicit user confirmation", async () => {
  const api = app();
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const headers = { "x-tenant-id": tenantId };

  const { project, generation } = await createGeneratedVideo(api, headers);
  await selectVideo(api, headers, project, generation.generated_videos[0].id);

  // Try to publish without user_confirmed_publish
  const response = await api.dispatch({
    method: "POST",
    path: "/ad-publications",
    headers,
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
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const headers = { "x-tenant-id": tenantId };

  const { project, generation } = await createGeneratedVideo(api, headers);
  await selectVideo(api, headers, project, generation.generated_videos[0].id);

  const response = await api.dispatch({
    method: "POST",
    path: "/ad-publications",
    headers,
    body: {
      project_id: project.creative_project.id,
      generated_video_id: generation.generated_videos[0].id,
      platform: "meta_ads",
      destination_url: "https://example.com/test-ad",
      user_confirmed_publish: true
    }
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.ad_publication.status, "published");
  assert.match(response.body.ad_publication.external_campaign_id, /^mock-campaign-/);
  assert.match(response.body.ad_publication.external_ad_group_id, /^mock-ad-group-/);
  assert.match(response.body.ad_publication.external_ad_id, /^mock-ad-/);
  assert.equal(response.body.fallback_reason, "mock_ad_publication");
  assert.ok(response.body.ad_publication.published_at);
});

test("live ad publication fails closed when platform config is missing", async () => {
  const api = app({
    KASTONOM_MODE: "live",
    KASTONOM_FALLBACK_ENABLED: "false"
  });
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const headers = { "x-tenant-id": tenantId };

  const { project, generation } = await createGeneratedVideo(api, headers);
  await selectVideo(api, headers, project, generation.generated_videos[0].id);

  const response = await api.dispatch({
    method: "POST",
    path: "/ad-publications",
    headers,
    body: {
      project_id: project.creative_project.id,
      generated_video_id: generation.generated_videos[0].id,
      platform: "meta_ads",
      user_confirmed_publish: true
    }
  });

  assert.equal(response.status, 500);
  assert.equal(response.body.error, "AD_PLATFORM_CONNECTION_NOT_READY");
});

test("ad publication requires video to be selected", async () => {
  const api = app();
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const headers = { "x-tenant-id": tenantId };

  const { project, generation } = await createGeneratedVideo(api, headers);
  // Note: NOT selecting the video

  const response = await api.dispatch({
    method: "POST",
    path: "/ad-publications",
    headers,
    body: {
      project_id: project.creative_project.id,
      generated_video_id: generation.generated_videos[0].id,
      platform: "meta_ads",
      user_confirmed_publish: true
    }
  });

  assert.equal(response.status, 422);
  assert.equal(response.body.error, "INVALID_REQUEST");
});

test("metrics sync stores only supplied metrics and does not invent missing values", async () => {
  const api = app();
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const headers = { "x-tenant-id": tenantId };

  const { project, generation } = await createGeneratedVideo(api, headers);
  await selectVideo(api, headers, project, generation.generated_videos[0].id);

  // Create publication first
  const pubResponse = await api.dispatch({
    method: "POST",
    path: "/ad-publications",
    headers,
    body: {
      project_id: project.creative_project.id,
      generated_video_id: generation.generated_videos[0].id,
      platform: "meta_ads",
      user_confirmed_publish: true
    }
  });

  assert.equal(pubResponse.status, 201);
  const pubId = pubResponse.body.ad_publication.id;

  // Sync metrics with partial data
  const metricsResponse = await api.dispatch({
    method: "POST",
    path: `/ad-publications/${pubId}/metrics/sync`,
    headers,
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

  assert.equal(metricsResponse.status, 201);
  assert.equal(metricsResponse.body.metrics_snapshot.impressions, 100);
  assert.equal(metricsResponse.body.metrics_snapshot.currency, "TRY");
  assert.equal(Object.hasOwn(metricsResponse.body.metrics_snapshot, "clicks"), false);
  assert.equal(Object.hasOwn(metricsResponse.body.metrics_snapshot, "spend"), false);
  assert.equal(Object.hasOwn(metricsResponse.body.metrics_snapshot, "roas"), false);
});

console.log("PostgreSQL Ad Publications tests loaded successfully");
