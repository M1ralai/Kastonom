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
    name: "Test Project",
    creative_subject: {
      subject_type: "product",
      name: "Test Product",
      description: "A test product description.",
      allowed_claims: ["Test claim"],
      forbidden_claims: [],
      unknown_fields: [],
      source: "user_input"
    },
    source_assets: [
      {
        asset_type: "image",
        source: "external_url",
        url: "https://example.com/product.png"
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

// Test suite setup
test.before(async () => {
  console.log("Initializing test database for generation flow...");
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

test("full mock flow creates prompt payload, job, generated video, polling response, and selection", async () => {
  const api = app();
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const headers = { "x-tenant-id": tenantId };

  const { project, generation } = await createGeneratedVideo(api, headers);

  // Verify prompt payload
  assert.equal(generation.prompt_payload.provider, "mock");
  assert.equal(generation.prompt_payload.is_mock, true);
  assert.match(generation.prompt_payload.prompt_text, /Test Product/);
  assert.ok(generation.prompt_payload.negative_prompt);
  assert.ok(generation.prompt_payload.fallback_notes);
  assert.equal(generation.prompt_payload.fallback_notes.length, 0); // No unknown fields

  // Verify video job
  assert.ok(generation.video_job);
  assert.equal(generation.video_job.status, "completed");
  assert.equal(generation.video_job.provider, "mock");
  assert.equal(generation.video_job.is_mock, true);
  assert.ok(generation.video_job.id);

  // Verify generated video
  assert.ok(generation.generated_videos);
  assert.equal(generation.generated_videos.length, 1);
  assert.equal(generation.generated_videos[0].is_mock, true);
  assert.equal(generation.generated_videos[0].status, "generated");
  assert.ok(generation.generated_videos[0].url);

  // Poll video job
  const polled = await api.dispatch({
    method: "GET",
    path: `/video-jobs/${generation.video_job.id}`,
    headers
  });
  assert.equal(polled.status, 200);
  assert.ok(polled.body.video_job);
  assert.ok(polled.body.generated_videos);
  assert.equal(polled.body.generated_videos.length, 1);

  // Select video
  const selected = await api.dispatch({
    method: "POST",
    path: `/generated-videos/${generation.generated_videos[0].id}/select`,
    headers,
    body: { project_id: project.creative_project.id }
  });
  assert.equal(selected.status, 200);
  assert.equal(selected.body.generated_video.is_selected, true);
  assert.equal(
    selected.body.creative_project.selected_generated_video_id,
    generation.generated_videos[0].id
  );
  assert.equal(selected.body.creative_project.status, "ready");
});

test("live provider without credentials fails closed when fallback is disabled", async () => {
  const api = app({
    KASTONOM_MODE: "live",
    KASTONOM_DEFAULT_VIDEO_PROVIDER: "pollo",
    KASTONOM_FALLBACK_ENABLED: "false"
  });
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const headers = { "x-tenant-id": tenantId };

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
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const headers = { "x-tenant-id": tenantId };

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
  assert.ok(response.body.fallback_reason);
  assert.ok(response.body.fallback_reason.includes("fallback_to_mock"));
});

test("generation request with missing source asset fails", async () => {
  const api = app();
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const headers = { "x-tenant-id": tenantId };

  const project = await createProject(api, headers);

  // Try to create generation request with non-existent asset ID
  const response = await api.dispatch({
    method: "POST",
    path: "/generation-requests",
    headers,
    body: {
      project_id: project.creative_project.id,
      source_asset_ids: ["00000000-0000-0000-0000-000000000099"],
      provider: "mock",
      objective: "awareness"
    }
  });

  assert.equal(response.status, 404);
  assert.equal(response.body.error, "SOURCE_ASSET_NOT_FOUND");
});

test("generation request stores fallback notes for unknown fields", async () => {
  const api = app();
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const headers = { "x-tenant-id": tenantId };

  // Create project with unknown fields
  const project = await createProject(api, headers, {
    creative_subject: {
      subject_type: "product",
      name: "Unknown Product",
      allowed_claims: [],
      forbidden_claims: [],
      unknown_fields: ["price", "discount"],
      source: "user_input"
    }
  });

  const generation = await api.dispatch({
    method: "POST",
    path: "/generation-requests",
    headers,
    body: {
      project_id: project.creative_project.id,
      source_asset_ids: [project.source_assets[0].id],
      provider: "mock",
      objective: "awareness"
      // No tone, style, or call_to_action
    }
  });

  assert.equal(generation.status, 202);
  // Should have fallback notes for unknown fields and missing optional fields
  assert.ok(generation.body.generation_request.fallback_notes);
  assert.ok(generation.body.generation_request.fallback_notes.length > 0);
});

console.log("PostgreSQL Generation Flow tests loaded successfully");
