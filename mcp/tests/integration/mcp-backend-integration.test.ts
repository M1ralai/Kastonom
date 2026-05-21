/**
 * MCP ↔ Backend Integration Tests
 * @module mcp/tests/integration
 * @description End-to-end tests for MCP integration with Backend
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createMCPFacade } from "../../src/facade/mcp-integration-facade.js";
import { createTenantContext, createDefaultProductMetrics } from "../../src/types/index.js";
import { compilePrompt } from "../../src/prompt-compiler/index.js";
import {
  createMockNetworkExecutor,
  createNetworkExecutor
} from "../../src/network/provider-network-executor.js";

// ============================================
// MCP Facade Tests
// ============================================

test("MCP facade creates valid instance", () => {
  const facade = createMCPFacade();
  assert.ok(facade);
});

test("MCP facade reports LLM availability correctly", () => {
  const withoutKey = createMCPFacade();
  assert.equal(withoutKey.isLLMAvailable(), false);

  const withKey = createMCPFacade({ llmApiKey: "test-key" });
  assert.equal(withKey.isLLMAvailable(), true);
});

test("MCP facade generates initial campaign scoring", () => {
  const facade = createMCPFacade();
  const tenant = createTenantContext({
    tenantId: "test-tenant",
    mode: "demo",
    status: "active"
  });
  const metrics = createDefaultProductMetrics("product-1", "test-tenant");

  const output = facade.generateInitialCampaign({
    tenantContext: tenant,
    productId: "product-1",
    productMetrics: metrics
  });

  assert.ok(output);
  assert.equal(output.product_id, "product-1");
  assert.ok(output.recommendation);
  assert.ok(output.scores);
  assert.ok(output.metadata);
});

test("MCP facade generates creative brief", () => {
  const facade = createMCPFacade();
  const tenant = createTenantContext({
    tenantId: "test-tenant",
    mode: "demo",
    status: "active"
  });
  const metrics = createDefaultProductMetrics("product-1", "test-tenant");

  const scoringOutput = facade.generateInitialCampaign({
    tenantContext: tenant,
    productId: "product-1",
    productMetrics: metrics
  });

  const brief = facade.generateCreativeBrief({ scoringOutput });
  assert.ok(brief);
  assert.ok(brief.hook);
  assert.ok(brief.main_claim);
  assert.ok(brief.call_to_action);
  assert.ok(brief.creative_angle);
  assert.ok(brief.tone);
});

test("MCP facade compiles prompt payload", () => {
  const facade = createMCPFacade();
  const brief = {
    hook: "Discover this product",
    main_claim: "High quality at great price",
    call_to_action: "Buy now",
    creative_angle: "value",
    tone: "modern"
  };

  const payload = facade.compilePrompt(
    {
      creativeBrief: brief,
      provider: "mock",
      durationSeconds: 15,
      aspectRatio: "9:16",
      language: "Turkish"
    },
    "test-tenant"
  );

  assert.ok(payload);
  assert.equal(payload.provider, "mock");
  assert.equal(payload.is_mock, true);
  assert.ok(payload.prompt_text);
  assert.ok(payload.negative_prompt);
});

test("MCP facade rejects invalid tenant context", () => {
  const facade = createMCPFacade();
  const invalidTenant = { tenant_id: "", mode: "demo" as const, status: "active" as const };

  assert.throws(() => {
    facade.generateInitialCampaign({
      tenantContext: invalidTenant as any,
      productId: "product-1",
      productMetrics: createDefaultProductMetrics("product-1", "")
    });
  });
});

// ============================================
// Prompt Compiler Tests
// ============================================

test("compilePrompt creates valid mock payload", () => {
  const brief = {
    hook: "Test hook",
    main_claim: "Test claim",
    call_to_action: "Click here",
    creative_angle: "premium",
    tone: "professional"
  };

  const payload = compilePrompt(brief, {
    provider: "mock",
    durationSeconds: 15,
    aspectRatio: "9:16",
    language: "English",
    isMock: true
  }, "test-tenant");

  assert.ok(payload);
  assert.equal(payload.provider, "mock");
  assert.equal(payload.is_mock, true);
  assert.ok(payload.prompt_text.includes("Test hook"));
});

test("compilePrompt creates valid pollo payload", () => {
  const brief = {
    hook: "Amazing product",
    main_claim: "Best in class",
    call_to_action: "Learn more",
    creative_angle: "trending",
    tone: "modern"
  };

  const payload = compilePrompt(brief, {
    provider: "pollo",
    durationSeconds: 30,
    aspectRatio: "16:9",
    language: "Turkish",
    isMock: false
  }, "test-tenant");

  assert.ok(payload);
  assert.equal(payload.provider, "pollo");
  assert.ok(payload.prompt_text.includes("dynamic"));
});

// ============================================
// Network Executor Tests
// ============================================

test("createMockNetworkExecutor returns valid executor", () => {
  const executor = createMockNetworkExecutor();
  assert.ok(executor);
  assert.ok(executor.hasCredentials);
  assert.ok(executor.executeSubmission);
});

test("mock provider always has credentials", () => {
  const executor = createMockNetworkExecutor();
  assert.equal(executor.hasCredentials("mock"), true);
});

test("non-mock providers without credentials return false", () => {
  const executor = createMockNetworkExecutor();
  assert.equal(executor.hasCredentials("pollo"), false);
  assert.equal(executor.hasCredentials("kling"), false);
  assert.equal(executor.hasCredentials("runway"), false);
});

test("getProviderReadiness returns correct status", () => {
  const executor = createMockNetworkExecutor();
  const readiness = executor.getProviderReadiness();

  assert.ok(readiness.mock);
  assert.equal(readiness.mock.ready, true);
  assert.equal(readiness.mock.is_mock, true);

  assert.ok(readiness.pollo);
  assert.equal(readiness.pollo.ready, false);
  assert.equal(readiness.pollo.is_mock, true);
});

test("kling submission uses Pollo AI Kling Video O1 reference-image endpoint", async (t) => {
  const originalFetch = globalThis.fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://pollo.ai/api/platform/generation/kling-ai/kling-video-o1");

    const headers = init?.headers as Record<string, string>;
    assert.equal(headers["x-api-key"], "test-pollo-key");
    assert.equal(headers["Content-Type"], "application/json");

    const body = JSON.parse(String(init?.body)) as {
      input: Record<string, unknown>;
      clientSource: string;
    };
    assert.deepEqual(body.input.images, ["https://cdn.example.com/reference.png"]);
    assert.equal(body.input.aspectRatio, "16:9");
    assert.equal(body.input.length, 15);
    assert.equal(body.input.mode, "pro");
    assert.equal(body.clientSource, "kastonom-mcp");
    assert.ok(String(body.input.prompt).includes("Amazing product"));

    return new Response(JSON.stringify({ data: { taskId: "pollo-task-1", status: "waiting" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  const brief = {
    hook: "Amazing product",
    main_claim: "Best in class",
    call_to_action: "Learn more",
    creative_angle: "cinematic",
    tone: "modern"
  };
  const payload = compilePrompt(brief, {
    provider: "kling",
    durationSeconds: 30,
    aspectRatio: "16:9",
    language: "Turkish",
    isMock: false
  }, "test-tenant");
  const payloadWithReferenceImage = {
    ...payload,
    provider_options: {
      ...payload.provider_options,
      reference_images: ["https://cdn.example.com/reference.png"]
    }
  };
  const executor = createNetworkExecutor({
    credentials: {
      pollo: {
        apiKey: "test-pollo-key",
        baseUrl: "https://pollo.ai"
      }
    },
    idFactory: (prefix) => `${prefix}-id`,
    now: () => "2026-05-21T00:00:00.000Z"
  });

  const result = await executor.executeSubmission(payloadWithReferenceImage);

  assert.equal(result.provider, "kling");
  assert.equal(result.provider_job_id, "pollo-task-1");
  assert.equal(result.raw_status, "waiting");
  assert.equal(result.normalized_status, "queued");
});

test("kling status polling reads Pollo AI generation output", async (t) => {
  const originalFetch = globalThis.fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://pollo.ai/api/platform/generation/pollo-task-1/status");

    const headers = init?.headers as Record<string, string>;
    assert.equal(headers["x-api-key"], "test-pollo-key");

    return new Response(JSON.stringify({
      data: {
        taskId: "pollo-task-1",
        generations: [
          {
            id: "generation-1",
            status: "succeed",
            url: "https://cdn.example.com/video.mp4"
          }
        ]
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  const executor = createNetworkExecutor({
    credentials: {
      pollo: {
        apiKey: "test-pollo-key",
        baseUrl: "https://pollo.ai"
      }
    }
  });

  const status = await executor.getJobStatus("kling", "pollo-task-1");

  assert.equal(status.status, "completed");
  assert.equal(status.videoUrl, "https://cdn.example.com/video.mp4");
});

console.log("MCP ↔ Backend integration tests loaded successfully");
