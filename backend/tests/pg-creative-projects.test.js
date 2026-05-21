import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
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

function multipartUploadRequest() {
  const boundary = "----kastonom-upload-test-boundary";
  const fileBytes = Buffer.from("fake-png-bytes");
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="asset_type"\r\n\r\nimage\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="source"\r\n\r\nupload\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="product.png"\r\nContent-Type: image/png\r\n\r\n`),
    fileBytes,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);
  const request = Readable.from([body]);
  request.headers = { "content-type": `multipart/form-data; boundary=${boundary}` };

  return {
    request,
    headers: request.headers
  };
}

// Test suite setup
test.before(async () => {
  console.log("Initializing test database for creative projects...");
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

test("GET /health returns ok status", async () => {
  const api = app();
  const response = await api.dispatch({ method: "GET", path: "/health" });

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
  assert.equal(response.body.mode, "mock");
});

test("POST /creative-projects creates project with subject and assets", async () => {
  const api = app();
  const response = await api.dispatch({
    method: "POST",
    path: "/creative-projects",
    headers: { "x-tenant-id": "00000000-0000-0000-0000-000000000001" },
    body: projectInput()
  });

  assert.equal(response.status, 201);
  assert.ok(response.body.creative_project);
  assert.ok(response.body.creative_project.id);
  assert.equal(response.body.creative_project.name, "Demo project");
  assert.ok(response.body.creative_subject);
  assert.equal(response.body.creative_subject.name, "Test Mug");
  assert.ok(response.body.source_assets);
  assert.equal(response.body.source_assets.length, 1);
  assert.equal(response.body.fallback_reason, null);
});

test("POST /source-assets/upload stores uploaded asset with resolved tenant id", async () => {
  const api = app();
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const upload = multipartUploadRequest();
  const response = await api.dispatch({
    method: "POST",
    path: "/source-assets/upload",
    headers: {
      ...upload.headers,
      "x-tenant-id": tenantId
    },
    rawRequest: upload.request
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.source_asset.tenant_id, tenantId);
  assert.equal(response.body.source_asset.project_id, null);
  assert.equal(response.body.source_asset.asset_type, "image");
  assert.equal(response.body.source_asset.source, "upload");
  assert.equal(response.body.source_asset.mime_type, "image/png");
  assert.match(response.body.upload_url, /^\/uploads\/.+\.png$/);
});

test("creative project API stores user facts and unknown fields without invention", async () => {
  const api = app();
  const response = await api.dispatch({
    method: "POST",
    path: "/creative-projects",
    headers: { "x-tenant-id": "00000000-0000-0000-0000-000000000001" },
    body: projectInput()
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.creative_subject.name, "Test Mug");
  assert.deepEqual(response.body.creative_subject.unknown_fields, ["price", "stock", "discount"]);
  assert.equal(response.body.creative_subject.price, null);
  assert.equal(response.body.fallback_reason, null);

  // Fetch and verify
  const fetched = await api.dispatch({
    method: "GET",
    path: `/creative-projects/${response.body.creative_project.id}`,
    headers: { "x-tenant-id": "00000000-0000-0000-0000-000000000001" }
  });
  assert.equal(fetched.status, 200);
  assert.equal(fetched.body.creative_project.id, response.body.creative_project.id);
  assert.equal(fetched.body.source_assets.length, 1);
});

test("GET /creative-projects lists all projects for tenant", async () => {
  const api = app();
  const tenantId = "00000000-0000-0000-0000-000000000001";

  // Create first project
  await api.dispatch({
    method: "POST",
    path: "/creative-projects",
    headers: { "x-tenant-id": tenantId },
    body: projectInput({ name: "Project One" })
  });

  // Create second project
  await api.dispatch({
    method: "POST",
    path: "/creative-projects",
    headers: { "x-tenant-id": tenantId },
    body: projectInput({ name: "Project Two" })
  });

  // List projects
  const listRes = await api.dispatch({
    method: "GET",
    path: "/creative-projects",
    headers: { "x-tenant-id": tenantId }
  });

  assert.equal(listRes.status, 200);
  assert.ok(Array.isArray(listRes.body));
  assert.ok(listRes.body.length >= 2);
});

test("tenant-scoped project lookup does not reveal cross-tenant data", async () => {
  const api = app();
  const tenantId1 = "00000000-0000-0000-0000-000000000001";
  const tenantId2 = "00000000-0000-0000-0000-000000000099";
  const pool = await getTestPool();
  await pool.query(
    `INSERT INTO tenants (id, name, mode, status)
     VALUES ($1, 'Second Test Tenant', 'mock', 'active')
     ON CONFLICT (id) DO UPDATE SET status = 'active'`,
    [tenantId2]
  );

  // Create project with tenant 1
  const created = await api.dispatch({
    method: "POST",
    path: "/creative-projects",
    headers: { "x-tenant-id": tenantId1 },
    body: projectInput()
  });

  assert.equal(created.status, 201);
  const projectId = created.body.creative_project.id;

  // Try to access with different tenant
  const crossTenant = await api.dispatch({
    method: "GET",
    path: `/creative-projects/${projectId}`,
    headers: { "x-tenant-id": tenantId2 }
  });

  assert.equal(crossTenant.status, 404);
  assert.equal(crossTenant.body.error, "CREATIVE_PROJECT_NOT_FOUND");
});

test("requests without token fall back to demo tenant in mock mode", async () => {
  const api = app();
  const mockTenant = await api.dispatch({
    method: "POST",
    path: "/creative-projects",
    body: projectInput()
  });

  assert.equal(mockTenant.status, 201);
  // In mock mode, no tenant header defaults to demo tenant
  assert.ok(mockTenant.body.creative_project.tenant_id);
});

test("live mode fails closed when tenant header is missing", async () => {
  const api = app({ KASTONOM_MODE: "live" });

  const response = await api.dispatch({
    method: "POST",
    path: "/creative-projects",
    body: projectInput()
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "INVALID_TENANT");
});

console.log("PostgreSQL Creative Projects tests loaded successfully");
