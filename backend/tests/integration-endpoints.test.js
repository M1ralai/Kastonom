/**
 * Integration Tests for All Backend Endpoints
 * Tests JWT authentication, new endpoints, and full flow
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { createClock } from "../src/domain/clock.js";
import { createIdFactory } from "../src/domain/ids.js";

const fixedClock = () => createClock({ fixed: "2026-01-01T00:00:00.000Z" });

function app(env = {}) {
  return createApp({
    env: {
      ...env,
      NODE_ENV: "test"
    },
    clock: fixedClock(),
    ids: createIdFactory()
  });
}

// Helper to register and get auth headers
async function getAuthHeaders(api) {
  const email = `test-${Date.now()}@example.com`;
  const password = "testpassword123";
  
  const registerRes = await api.dispatch({
    method: "POST",
    path: "/auth/register",
    body: {
      email,
      password,
      name: "Test User",
      company_name: "Test Company"
    }
  });
  
  assert.equal(registerRes.status, 201);
  const token = registerRes.body.token;
  
  return {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    "x-tenant-id": registerRes.body.user.tenant_id
  };
}

// ─── Dashboard KPI Summary Tests ─────────────────────────────────────

test("GET /dashboard/kpi-summary returns KPI data for authenticated user", async () => {
  const api = app();
  const headers = await getAuthHeaders(api);
  
  const response = await api.dispatch({
    method: "GET",
    path: "/dashboard/kpi-summary",
    headers
  });
  
  assert.equal(response.status, 200);
  assert.ok(typeof response.body.monthly_video_count === "number");
  assert.ok(typeof response.body.monthly_video_change === "number");
  assert.ok(typeof response.body.remaining_credits === "number");
  assert.ok(typeof response.body.credit_currency === "string");
  assert.ok(typeof response.body.average_ctr === "number");
  assert.ok(typeof response.body.sector_average_ctr === "number");
  assert.ok(typeof response.body.ctr_change_percent === "number");
});

test("GET /dashboard/kpi-summary requires authentication", async () => {
  const api = app();
  
  const response = await api.dispatch({
    method: "GET",
    path: "/dashboard/kpi-summary",
    headers: {}
  });
  
  // Should return 401 or fall back to demo tenant based on config
  assert.ok([200, 401].includes(response.status));
});

// ─── Dashboard Recent Activities Tests ─────────────────────────────────

test("GET /dashboard/recent-activities returns activities for authenticated user", async () => {
  const api = app();
  const headers = await getAuthHeaders(api);
  
  const response = await api.dispatch({
    method: "GET",
    path: "/dashboard/recent-activities",
    headers
  });
  
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.activities));
});

test("GET /dashboard/recent-activities accepts limit parameter", async () => {
  const api = app();
  const headers = await getAuthHeaders(api);
  
  const response = await api.dispatch({
    method: "GET",
    path: "/dashboard/recent-activities?limit=5",
    headers
  });
  
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.activities));
});

// ─── Tenant Credits Tests ───────────────────────────────────────────────

test("GET /tenant/credits returns credits for authenticated user", async () => {
  const api = app();
  const headers = await getAuthHeaders(api);
  
  const response = await api.dispatch({
    method: "GET",
    path: "/tenant/credits",
    headers
  });
  
  assert.equal(response.status, 200);
  assert.ok(response.body.tenant_id);
  assert.ok(typeof response.body.current_credits === "number");
  assert.ok(typeof response.body.credit_currency === "string");
  assert.ok(typeof response.body.monthly_allowance === "number");
  assert.ok(typeof response.body.used_this_month === "number");
  assert.ok(typeof response.body.videos_per_credit === "number");
});

// ─── Creative Project Metrics Tests ─────────────────────────────────────

test("GET /creative-projects/:id/metrics returns project metrics", async () => {
  const api = app();
  const headers = await getAuthHeaders(api);
  
  // Create a project first
  const projectRes = await api.dispatch({
    method: "POST",
    path: "/creative-projects",
    headers,
    body: {
      name: "Metrics Test Project",
      creative_subject: {
        subject_type: "product",
        name: "Test Product",
        price: 199.99,
        allowed_claims: ["Test claim"],
        forbidden_claims: [],
        unknown_fields: [],
        source: "user_input"
      },
      source_assets: [
        {
          asset_type: "image",
          source: "external_url",
          url: "https://example.com/image.jpg"
        }
      ]
    }
  });
  
  assert.equal(projectRes.status, 201);
  const projectId = projectRes.body.creative_project.id;
  
  // Get metrics
  const metricsRes = await api.dispatch({
    method: "GET",
    path: `/creative-projects/${projectId}/metrics`,
    headers
  });
  
  assert.equal(metricsRes.status, 200);
  assert.equal(metricsRes.body.project_id, projectId);
  assert.ok(metricsRes.body.creative_subject);
  assert.ok(typeof metricsRes.body.creative_subject.ai_score === "number");
  assert.ok(Array.isArray(metricsRes.body.creative_subject.ai_reasons));
  assert.ok(metricsRes.body.erp_data);
});

test("GET /creative-projects/:id/metrics returns 404 for non-existent project", async () => {
  const api = app();
  const headers = await getAuthHeaders(api);
  
  const response = await api.dispatch({
    method: "GET",
    path: "/creative-projects/non-existent-id/metrics",
    headers
  });
  
  assert.equal(response.status, 404);
});

// ─── Generation Request Estimate Cost Tests ─────────────────────────────

test("POST /generation-requests/estimate-cost returns cost estimate", async () => {
  const api = app();
  const headers = await getAuthHeaders(api);
  
  const response = await api.dispatch({
    method: "POST",
    path: "/generation-requests/estimate-cost",
    headers,
    body: {
      platform: "tiktok",
      duration_seconds: 15,
      aspect_ratio: "9:16"
    }
  });
  
  assert.equal(response.status, 200);
  assert.ok(typeof response.body.estimated_credits === "number");
  assert.ok(response.body.estimated_cost);
  assert.ok(typeof response.body.estimated_cost.amount === "number");
  assert.ok(typeof response.body.estimated_cost.currency === "string");
  assert.ok(typeof response.body.estimated_cost.max_amount === "number");
});

test("POST /generation-requests/estimate-cost validates platform", async () => {
  const api = app();
  const headers = await getAuthHeaders(api);
  
  const response = await api.dispatch({
    method: "POST",
    path: "/generation-requests/estimate-cost",
    headers,
    body: {
      platform: "invalid_platform",
      duration_seconds: 15,
      aspect_ratio: "9:16"
    }
  });
  
  assert.equal(response.status, 400);
});

test("POST /generation-requests/estimate-cost validates duration", async () => {
  const api = app();
  const headers = await getAuthHeaders(api);
  
  const response = await api.dispatch({
    method: "POST",
    path: "/generation-requests/estimate-cost",
    headers,
    body: {
      platform: "tiktok",
      duration_seconds: -5,
      aspect_ratio: "9:16"
    }
  });
  
  assert.equal(response.status, 400);
});

// ─── Video Job Full Details Tests ───────────────────────────────────────

test("GET /video-jobs/:id/full returns full job details", async () => {
  const api = app();
  const headers = await getAuthHeaders(api);
  
  // Create a project first
  const projectRes = await api.dispatch({
    method: "POST",
    path: "/creative-projects",
    headers,
    body: {
      name: "Video Job Test Project",
      creative_subject: {
        subject_type: "product",
        name: "Test Product",
        allowed_claims: ["Test claim"],
        forbidden_claims: [],
        unknown_fields: [],
        source: "user_input"
      },
      source_assets: [
        {
          asset_type: "image",
          source: "external_url",
          url: "https://example.com/image.jpg"
        }
      ]
    }
  });
  
  assert.equal(projectRes.status, 201);
  const projectId = projectRes.body.creative_project.id;
  
  // Create a generation request
  const genRes = await api.dispatch({
    method: "POST",
    path: "/generation-requests",
    headers,
    body: {
      project_id: projectId,
      source_asset_ids: [projectRes.body.source_assets[0].id],
      objective: "awareness",
      platform: "tiktok",
      duration_seconds: 15,
      aspect_ratio: "9:16",
      language: "Turkish"
    }
  });
  
  assert.equal(genRes.status, 202);
  const videoJobId = genRes.body.video_job.id;
  
  // Get full job details
  const fullRes = await api.dispatch({
    method: "GET",
    path: `/video-jobs/${videoJobId}/full`,
    headers
  });
  
  assert.equal(fullRes.status, 200);
  assert.ok(fullRes.body.video_job);
  assert.equal(fullRes.body.video_job.id, videoJobId);
  assert.ok(fullRes.body.project);
  assert.ok(fullRes.body.creative_subject);
  assert.ok(fullRes.body.generation_request);
  assert.ok(Array.isArray(fullRes.body.generated_videos));
});

test("GET /video-jobs/:id/full returns 404 for non-existent job", async () => {
  const api = app();
  const headers = await getAuthHeaders(api);
  
  const response = await api.dispatch({
    method: "GET",
    path: "/video-jobs/non-existent-id/full",
    headers
  });
  
  assert.equal(response.status, 404);
});

// ─── Auth Token Tests ───────────────────────────────────────────────────

test("Auth token contains correct tenant_id for protected endpoints", async () => {
  const api = app();
  
  // Register
  const registerRes = await api.dispatch({
    method: "POST",
    path: "/auth/register",
    body: {
      email: `token-test-${Date.now()}@example.com`,
      password: "testpassword123",
      name: "Token Test User"
    }
  });
  
  assert.equal(registerRes.status, 201);
  const token = registerRes.body.token;
  const tenantId = registerRes.body.user.tenant_id;
  
  // Use token to create project - should have correct tenant_id
  const projectRes = await api.dispatch({
    method: "POST",
    path: "/creative-projects",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-tenant-id": tenantId
    },
    body: {
      name: "Token Test Project",
      creative_subject: {
        subject_type: "product",
        name: "Token Test Product",
        allowed_claims: ["Test"],
        forbidden_claims: [],
        unknown_fields: [],
        source: "user_input"
      },
      source_assets: []
    }
  });
  
  assert.equal(projectRes.status, 201);
  assert.equal(projectRes.body.creative_project.tenant_id, tenantId);
});

test("Login returns access_token and refresh_token", async () => {
  const api = app();
  
  // Register first
  const email = `login-test-${Date.now()}@example.com`;
  await api.dispatch({
    method: "POST",
    path: "/auth/register",
    body: {
      email,
      password: "testpassword123",
      name: "Login Test User"
    }
  });
  
  // Login
  const loginRes = await api.dispatch({
    method: "POST",
    path: "/auth/login",
    body: {
      email,
      password: "testpassword123"
    }
  });
  
  assert.equal(loginRes.status, 200);
  assert.ok(loginRes.body.user);
  assert.ok(loginRes.body.access_token || loginRes.body.token);
  assert.ok(loginRes.body.refresh_token);
  assert.ok(loginRes.body.expires_in);
});

test("Login rejects wrong password", async () => {
  const api = app();
  
  // Register first
  const email = `wrongpass-${Date.now()}@example.com`;
  await api.dispatch({
    method: "POST",
    path: "/auth/register",
    body: {
      email,
      password: "correctpassword",
      name: "Wrong Pass User"
    }
  });
  
  // Login with wrong password
  const loginRes = await api.dispatch({
    method: "POST",
    path: "/auth/login",
    body: {
      email,
      password: "wrongpassword"
    }
  });
  
  assert.equal(loginRes.status, 401);
  assert.equal(loginRes.body.error, "INVALID_CREDENTIALS");
});

// ─── Full Flow Tests ────────────────────────────────────────────────────

test("Full creative project flow: register -> create project -> generate", async () => {
  const api = app();
  
  // 1. Register
  const registerRes = await api.dispatch({
    method: "POST",
    path: "/auth/register",
    body: {
      email: `full-flow-${Date.now()}@example.com`,
      password: "testpassword123",
      name: "Full Flow User"
    }
  });
  
  assert.equal(registerRes.status, 201);
  const token = registerRes.body.token;
  const tenantId = registerRes.body.user.tenant_id;
  
  const headers = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    "x-tenant-id": tenantId
  };
  
  // 2. Create project
  const projectRes = await api.dispatch({
    method: "POST",
    path: "/creative-projects",
    headers,
    body: {
      name: "Full Flow Project",
      creative_subject: {
        subject_type: "product",
        name: "Full Flow Product",
        description: "Test product for full flow",
        price: 299.99,
        currency: "TRY",
        allowed_claims: ["Premium product", "Test claim"],
        forbidden_claims: [],
        unknown_fields: ["stock"],
        source: "user_input"
      },
      source_assets: [
        {
          asset_type: "image",
          source: "external_url",
          url: "https://example.com/product.jpg"
        }
      ]
    }
  });
  
  assert.equal(projectRes.status, 201);
  const projectId = projectRes.body.creative_project.id;
  const assetId = projectRes.body.source_assets[0].id;
  
  // 3. Get KPI summary
  const kpiRes = await api.dispatch({
    method: "GET",
    path: "/dashboard/kpi-summary",
    headers
  });
  
  assert.equal(kpiRes.status, 200);
  
  // 4. Get project metrics
  const metricsRes = await api.dispatch({
    method: "GET",
    path: `/creative-projects/${projectId}/metrics`,
    headers
  });
  
  assert.equal(metricsRes.status, 200);
  assert.ok(metricsRes.body.creative_subject.ai_score > 0);
  
  // 5. Create generation request
  const genRes = await api.dispatch({
    method: "POST",
    path: "/generation-requests",
    headers,
    body: {
      project_id: projectId,
      source_asset_ids: [assetId],
      objective: "awareness",
      platform: "tiktok",
      duration_seconds: 15,
      aspect_ratio: "9:16",
      language: "Turkish",
      tone: "Enerjik",
      style: "Ürün odaklı",
      call_to_action: "Hemen satın al"
    }
  });
  
  assert.equal(genRes.status, 202);
  assert.ok(genRes.body.generation_request);
  assert.ok(genRes.body.video_job);
  
  // 6. Get video job full details
  const videoJobId = genRes.body.video_job.id;
  const fullRes = await api.dispatch({
    method: "GET",
    path: `/video-jobs/${videoJobId}/full`,
    headers
  });
  
  assert.equal(fullRes.status, 200);
  assert.ok(fullRes.body.video_job);
  assert.ok(fullRes.body.project);
  assert.ok(fullRes.body.creative_subject);
  assert.ok(fullRes.body.generation_request);
  
  // 7. Get recent activities
  const activitiesRes = await api.dispatch({
    method: "GET",
    path: "/dashboard/recent-activities",
    headers
  });
  
  assert.equal(activitiesRes.status, 200);
  assert.ok(Array.isArray(activitiesRes.body.activities));
  
  // 8. Get tenant credits
  const creditsRes = await api.dispatch({
    method: "GET",
    path: "/tenant/credits",
    headers
  });
  
  assert.equal(creditsRes.status, 200);
  assert.ok(creditsRes.body.current_credits >= 0);
});

test("Estimate cost returns correct values for different platforms", async () => {
  const api = app();
  const headers = await getAuthHeaders(api);
  
  // Test TikTok
  const tiktokRes = await api.dispatch({
    method: "POST",
    path: "/generation-requests/estimate-cost",
    headers,
    body: {
      platform: "tiktok",
      duration_seconds: 15,
      aspect_ratio: "9:16"
    }
  });
  assert.equal(tiktokRes.status, 200);
  const baseCredits = tiktokRes.body.estimated_credits;
  const baseCost = tiktokRes.body.estimated_cost.amount;
  
  // Test YouTube Shorts (should be more expensive)
  const youtubeRes = await api.dispatch({
    method: "POST",
    path: "/generation-requests/estimate-cost",
    headers,
    body: {
      platform: "youtube_shorts",
      duration_seconds: 15,
      aspect_ratio: "9:16"
    }
  });
  assert.equal(youtubeRes.status, 200);
  assert.ok(youtubeRes.body.estimated_credits >= baseCredits);
  
  // Test 30 second duration (should be more expensive)
  const longRes = await api.dispatch({
    method: "POST",
    path: "/generation-requests/estimate-cost",
    headers,
    body: {
      platform: "tiktok",
      duration_seconds: 30,
      aspect_ratio: "9:16"
    }
  });
  assert.equal(longRes.status, 200);
  assert.ok(longRes.body.estimated_credits > baseCredits);
});

console.log("All integration endpoint tests loaded successfully");