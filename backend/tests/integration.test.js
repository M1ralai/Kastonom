/**
 * Backend Integration Tests
 * @description Test backend services and API integration
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock dependencies
const mockStore = {
  findAll: vi.fn(),
  findOne: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  upsert: vi.fn()
};

const mockIds = {
  next: vi.fn((type) => `${type}-${Date.now()}`)
};

const mockClock = {
  now: () => new Date().toISOString()
};

const mockConfig = {
  mockPreviewUrl: "/demo-assets/mock-ad-preview.mp4",
  videoProviderReadiness: {
    mock: { ready: true, is_mock: true },
    pollo: { ready: false, is_mock: true },
    kling: { ready: false, is_mock: true },
    runway: { ready: false, is_mock: true }
  }
};

// Import services
import { createAuthService } from "../src/auth/auth.service.js";
import { createProviderOrchestratorService } from "../src/providers/provider-orchestrator.service.js";
import { createERPConnectorService } from "../src/erp/erp-connector.js";

describe("Backend Services Integration", () => {
  let authService;
  let providerOrchestrator;
  let erpConnector;

  beforeEach(() => {
    vi.clearAllMocks();

    authService = createAuthService({
      store: mockStore,
      ids: mockIds,
      clock: mockClock,
      config: mockConfig
    });

    providerOrchestrator = createProviderOrchestratorService({
      store: mockStore,
      ids: mockIds,
      clock: mockClock,
      config: mockConfig
    });

    erpConnector = createERPConnectorService({
      store: mockStore,
      ids: mockIds,
      clock: mockClock,
      config: mockConfig
    });
  });

  describe("Auth Service", () => {
    it("should validate demo token", () => {
      mockStore.findOne.mockReturnValue({
        id: "tenant-001",
        name: "Test Tenant",
        mode: "demo",
        status: "active"
      });

      const result = authService.validateToken("demo-token");
      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.tenant).toBeDefined();
    });

    it("should reject invalid token", () => {
      mockStore.findOne.mockReturnValue(null);

      const result = authService.validateToken("invalid-token");
      expect(result).toBeDefined();
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should generate tokens", () => {
      const token = authService.generateToken("tenant-001", { role: "admin" });
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(0);
    });

    it("should verify generated tokens", () => {
      const token = authService.generateToken("tenant-001", { role: "admin" });
      const verified = authService.verifyToken(token);
      expect(verified.valid).toBe(true);
    });
  });

  describe("Provider Orchestrator", () => {
    it("should create mock video job", () => {
      const context = {
        tenant_id: "tenant-001",
        fallback_enabled: true
      };

      const project = { id: "project-001" };
      const generationRequest = { id: "gen-req-001", duration_seconds: 15, aspect_ratio: "9:16" };
      const promptPayload = { id: "payload-001", provider: "mock", tenant_id: "tenant-001", fallback_reason: null };

      const result = providerOrchestrator.createVideoJob(context, {
        project,
        generationRequest,
        promptPayload,
        requestedProvider: "mock"
      });

      expect(result).toBeDefined();
      expect(result.video_job).toBeDefined();
      expect(result.video_job.status).toBe("completed");
    });

    it("should fallback to mock when provider not configured", () => {
      const context = {
        tenant_id: "tenant-001",
        fallback_enabled: true
      };

      const project = { id: "project-001" };
      const generationRequest = { id: "gen-req-001", duration_seconds: 15, aspect_ratio: "9:16" };
      const promptPayload = { id: "payload-001", provider: "pollo", tenant_id: "tenant-001", fallback_reason: null };

      const result = providerOrchestrator.createVideoJob(context, {
        project,
        generationRequest,
        promptPayload,
        requestedProvider: "pollo"
      });

      expect(result).toBeDefined();
      expect(result.video_job.provider).toBe("mock");
      expect(result.fallback_reason).toBeDefined();
    });

    it("should throw when provider unavailable and fallback disabled", () => {
      const context = {
        tenant_id: "tenant-001",
        fallback_enabled: false
      };

      const project = { id: "project-001" };
      const generationRequest = { id: "gen-req-001", duration_seconds: 15, aspect_ratio: "9:16" };
      const promptPayload = { id: "payload-001", provider: "pollo", tenant_id: "tenant-001", fallback_reason: null };

      expect(() => providerOrchestrator.createVideoJob(context, {
        project,
        generationRequest,
        promptPayload,
        requestedProvider: "pollo"
      })).toThrow();
    });
  });

  describe("ERP Connector", () => {
    it("should return mock products", async () => {
      const result = await erpConnector.fetchProducts("mock");

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0]).toHaveProperty("name");
      expect(result.items[0]).toHaveProperty("price");
    });

    it("should return mock stock data", async () => {
      const result = await erpConnector.fetchStock("mock");

      expect(result).toBeDefined();
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });

    it("should return mock sales data", async () => {
      const result = await erpConnector.fetchSales("mock", {
        startDate: "2024-01-01",
        endDate: "2024-01-31"
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("total_revenue");
      expect(result).toHaveProperty("top_products");
    });

    it("should report ERP readiness", () => {
      const readiness = erpConnector.getERPReadiness();

      expect(readiness).toBeDefined();
      expect(readiness.mock).toBeDefined();
      expect(readiness.mock.ready).toBe(true);
      expect(readiness.mock.is_mock).toBe(true);
    });
  });
});

describe("Webhook Handler Integration", () => {
  it("should parse Pollo webhook payload", async () => {
    const { createWebhookHandlerService } = await import("../src/webhooks/webhook-handler.js");

    const webhookService = createWebhookHandlerService({
      store: mockStore,
      videoJobService: {
        updateVideoJob: vi.fn()
      },
      generatedVideoService: {
        createGeneratedVideo: vi.fn()
      },
      clock: mockClock
    });

    const payload = webhookService.parseWebhookPayload("pollo", {
      id: "job-123",
      status: "completed",
      url: "https://example.com/video.mp4"
    });

    expect(payload.provider).toBe("pollo");
    expect(payload.provider_job_id).toBe("job-123");
    expect(payload.status).toBe("completed");
    expect(payload.video_url).toBe("https://example.com/video.mp4");
  });

  it("should parse Kling webhook payload", async () => {
    const { createWebhookHandlerService } = await import("../src/webhooks/webhook-handler.js");

    const webhookService = createWebhookHandlerService({
      store: mockStore,
      videoJobService: {
        updateVideoJob: vi.fn()
      },
      generatedVideoService: {
        createGeneratedVideo: vi.fn()
      },
      clock: mockClock
    });

    const payload = webhookService.parseWebhookPayload("kling", {
      task_id: "task-456",
      task_status: "completed",
      video: { url: "https://example.com/kling-video.mp4" }
    });

    expect(payload.provider).toBe("kling");
    expect(payload.provider_job_id).toBe("task-456");
    expect(payload.status).toBe("completed");
    expect(payload.video_url).toBe("https://example.com/kling-video.mp4");
  });
});
