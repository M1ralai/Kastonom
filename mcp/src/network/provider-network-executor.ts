/**
 * MCP Network - Provider Network Executor
 * @module mcp/network
 * @file MCP-007: Direct provider API execution from MCP layer
 * @description Send prompt payloads to live video provider APIs.
 */

import type { PromptPayload, ProviderResult, VideoProvider, VideoJobStatus } from "../types/index.js";
import { PolloAPIClient } from "./provider-api-clients.js";

/**
 * Provider API configuration
 */
export interface ProviderAPIConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs?: number;
}

/**
 * Provider credentials for each provider
 */
export interface ProviderCredentials {
  pollo?: ProviderAPIConfig;
  kling?: ProviderAPIConfig;
  runway?: ProviderAPIConfig;
}

/**
 * Network executor options
 */
export interface NetworkExecutorOptions {
  credentials: ProviderCredentials;
  defaultTimeoutMs?: number;
  fallbackEnabled?: boolean;
  mockPreviewUrl?: string;
  idFactory?: (prefix: string) => string;
  now?: () => string;
}

export interface ProviderExecutionOptions {
  fallbackEnabled?: boolean;
  fallbackReason?: string | null;
  mockPreviewUrl?: string;
}

/**
 * Status mapping from provider-specific to normalized status
 */
function mapProviderStatus(
  provider: VideoProvider,
  rawStatus: string
): VideoJobStatus {
  const status = rawStatus.toLowerCase();

  // Pollo status mapping
  if (provider === "pollo") {
    if (status === "completed" || status === "done") return "completed";
    if (status === "failed" || status === "error") return "failed";
    if (status === "processing" || status === "generating") return "processing";
    return "queued";
  }

  // Kling status mapping
  if (provider === "kling") {
    if (status === "completed" || status === "succeed") return "completed";
    if (status === "failed") return "failed";
    if (status === "processing" || status === "running") return "processing";
    return "queued";
  }

  // Runway status mapping
  if (provider === "runway") {
    if (status === "completed" || status === "done") return "completed";
    if (status === "failed") return "failed";
    if (status === "processing" || status === "running") return "processing";
    return "queued";
  }

  return "queued";
}

/**
 * Provider network executor
 * @description Execute HTTP requests to live video provider APIs.
 */
export class ProviderNetworkExecutor {
  private credentials: ProviderCredentials;
  private defaultTimeoutMs: number;
  private fallbackEnabled: boolean;
  private mockPreviewUrl: string;
  private idFactory: (prefix: string) => string;
  private now: () => string;
  private clientCache: Map<VideoProvider, PolloAPIClient | null>;

  constructor(options: NetworkExecutorOptions) {
    this.credentials = options.credentials;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 30000;
    this.fallbackEnabled = options.fallbackEnabled ?? false;
    this.mockPreviewUrl = options.mockPreviewUrl ?? "/demo-assets/mock-ad-preview.mp4";
    this.idFactory = options.idFactory ?? ((prefix: string) => `${prefix}-${Date.now()}`);
    this.now = options.now ?? (() => new Date().toISOString());
    this.clientCache = new Map();
  }

  /**
   * Check if provider credentials are available
   */
  hasCredentials(provider: VideoProvider): boolean {
    if (provider === "mock") {
      return true;
    }
    return this.getProviderConfig(provider) !== null;
  }

  /**
   * Get credentials for provider (only call for non-mock providers)
   */
  private getProviderConfig(provider: VideoProvider): ProviderAPIConfig | null {
    if (provider === "mock") {
      return null;
    }
    const cred = this.credentials;
    // Type-safe access for non-mock providers only
    if (provider === "pollo" && cred.pollo?.apiKey && cred.pollo?.baseUrl) {
      return cred.pollo;
    }
    if (provider === "kling" && cred.kling?.apiKey && cred.kling?.baseUrl) {
      return cred.kling;
    }
    if (provider === "runway" && cred.runway?.apiKey && cred.runway?.baseUrl) {
      return cred.runway;
    }
    return null;
  }

  /**
   * Get or create API client for provider
   */
  private getAPIClient(provider: VideoProvider): PolloAPIClient | null {
    if (this.clientCache.has(provider)) {
      return this.clientCache.get(provider) ?? null;
    }

    const config = this.getProviderConfig(provider);
    if (!config) {
      this.clientCache.set(provider, null);
      return null;
    }

    const client = new PolloAPIClient({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      timeoutMs: config.timeoutMs ?? this.defaultTimeoutMs
    });

    this.clientCache.set(provider, client);
    return client;
  }

  /**
   * Execute provider submission with real API call
   * @param promptPayload - Compiled prompt payload
   * @returns Normalized provider result
   */
  async executeSubmission(
    promptPayload: PromptPayload,
    options: ProviderExecutionOptions = {}
  ): Promise<ProviderResult> {
    const provider = promptPayload.provider;
    const fallbackEnabled = options.fallbackEnabled ?? this.fallbackEnabled;
    const fallbackReason = options.fallbackReason ?? promptPayload.fallback_reason ?? null;
    const mockPreviewUrl = options.mockPreviewUrl ?? this.mockPreviewUrl;

    // If mock provider, return mock result
    if (provider === "mock") {
      return this.createMockResult(promptPayload, fallbackReason, mockPreviewUrl);
    }

    // For live providers, check credentials
    const config = this.getProviderConfig(provider);
    if (!config) {
      if (fallbackEnabled) {
        return this.createMockResult(
          promptPayload,
          "provider_config_missing_fallback_to_mock",
          mockPreviewUrl
        );
      }

      const error = new Error(`${provider} provider configuration is missing.`);
      (error as Error & { code?: string; fallbackAvailable?: boolean }).code = "PROVIDER_CONFIG_MISSING";
      (error as Error & { code?: string; fallbackAvailable?: boolean }).fallbackAvailable = false;
      throw error;
    }

    try {
      // Execute real API call based on provider
      const result = await this.callProviderAPI(provider, promptPayload);
      return result;
    } catch (error) {
      const providerMessage = error instanceof Error ? error.message : String(error);

      if (fallbackEnabled) {
        return this.createMockResult(
          promptPayload,
          "provider_execution_failed_fallback_to_mock",
          mockPreviewUrl,
          providerMessage
        );
      }

      const executionError = new Error(`${provider} provider execution failed.`);
      (executionError as Error & { code?: string; providerMessage?: string; fallbackAvailable?: boolean }).code = "PROVIDER_UNAVAILABLE";
      (executionError as Error & { code?: string; providerMessage?: string; fallbackAvailable?: boolean }).providerMessage = providerMessage;
      (executionError as Error & { code?: string; providerMessage?: string; fallbackAvailable?: boolean }).fallbackAvailable = false;
      throw executionError;
    }
  }

  /**
   * Call provider API based on provider type
   */
  private async callProviderAPI(
    provider: VideoProvider,
    promptPayload: PromptPayload
  ): Promise<ProviderResult> {
    const config = this.getProviderConfig(provider);
    if (!config) {
      throw new Error(`No configuration for provider: ${provider}`);
    }

    const options = {
      durationSeconds: promptPayload.duration_seconds,
      aspectRatio: promptPayload.aspect_ratio,
      negativePrompt: promptPayload.negative_prompt || undefined
    };

    let jobId: string;
    let status: string;

    // Call appropriate provider API
    const response = await fetch(
      provider === "pollo"
        ? `${config.baseUrl}/v1/videos/generate`
        : provider === "kling"
        ? `${config.baseUrl}/api/v1/videos`
        : `${config.baseUrl}/v1/text_to_video`,
      {
        method: "POST",
        headers: this.getProviderHeaders(provider, config.apiKey),
        body: JSON.stringify(this.buildProviderPayload(provider, promptPayload, options))
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`${provider} API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as Record<string, unknown>;

    // Extract job ID based on provider response format
    if (provider === "pollo") {
      jobId = String(data.id ?? "");
      status = String(data.status || "queued");
    } else if (provider === "kling") {
      jobId = String(data.task_id ?? "");
      status = String(data.task_status || "queued");
    } else {
      // Runway
      jobId = String(data.id ?? "");
      status = String(data.status || "pending");
    }

    const resultUrls = extractResultUrls(provider, data);

    return {
      id: this.idFactory("provider-result"),
      tenant_id: promptPayload.tenant_id,
      video_job_id: "",
      provider,
      provider_job_id: jobId,
      raw_status: status,
      normalized_status: mapProviderStatus(provider, status),
      result_urls: resultUrls,
      error_code: null,
      error_message: null,
      redacted_metadata: {
        adapter: `${provider}-prompt-adapter`,
        is_mock: false
      },
      received_at: this.now()
    };
  }

  /**
   * Get provider-specific headers
   */
  private getProviderHeaders(provider: VideoProvider, apiKey: string): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (provider === "pollo" || provider === "runway") {
      headers["Authorization"] = `Bearer ${apiKey}`;
    } else if (provider === "kling") {
      headers["X-API-Key"] = apiKey;
    }

    return headers;
  }

  /**
   * Build provider-specific payload
   */
  private buildProviderPayload(
    provider: VideoProvider,
    promptPayload: PromptPayload,
    options: {
      durationSeconds: number;
      aspectRatio: string;
      negativePrompt?: string;
    }
  ): Record<string, unknown> {
    const basePayload = {
      prompt: promptPayload.prompt_text,
      negative_prompt: options.negativePrompt,
      duration: options.durationSeconds,
      aspect_ratio: options.aspectRatio
    };

    if (provider === "pollo") {
      return {
        ...basePayload,
        model: "pollo-v1"
      };
    } else if (provider === "kling") {
      return {
        text: promptPayload.prompt_text,
        negative_text: options.negativePrompt,
        duration: options.durationSeconds,
        aspect_ratio: options.aspectRatio,
        model_id: "kling-video-v1"
      };
    } else {
      // Runway
      return {
        ...basePayload,
        model: "gen3a_turbo"
      };
    }
  }

  /**
   * Get job status from provider
   */
  async getJobStatus(
    provider: VideoProvider,
    providerJobId: string
  ): Promise<{
    status: "queued" | "processing" | "completed" | "failed";
    videoUrl?: string;
    error?: string;
  }> {
    const config = this.getProviderConfig(provider);
    if (!config) {
      throw new Error(`No configuration for provider: ${provider}`);
    }

    const url =
      provider === "pollo"
        ? `${config.baseUrl}/v1/videos/${providerJobId}`
        : provider === "kling"
        ? `${config.baseUrl}/api/v1/videos/${providerJobId}`
        : `${config.baseUrl}/v1/text_to_video/${providerJobId}`;

    const response = await fetch(url, {
      headers: this.getProviderHeaders(provider, config.apiKey)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`${provider} status check error: ${response.status} - ${error}`);
    }

    const data = await response.json() as Record<string, unknown>;

    // Extract status and URL based on provider response format
    let status: string;
    let videoUrl: string | undefined;
    let error: string | undefined;

    if (provider === "pollo") {
      status = String(data.status ?? "queued");
      videoUrl = data.url ? String(data.url) : undefined;
      error = data.error ? String(data.error) : undefined;
    } else if (provider === "kling") {
      status = String(data.task_status ?? "queued");
      const video = data.video as Record<string, unknown> | undefined;
      videoUrl = video?.url ? String(video.url) : undefined;
      error = data.error ? String(data.error) : undefined;
    } else {
      // Runway
      status = String(data.status ?? "pending");
      const output = data.output as Record<string, unknown> | undefined;
      videoUrl = output?.video_url ? String(output.video_url) : undefined;
      error = data.error ? String(data.error) : undefined;
    }

    return {
      status: mapProviderStatus(provider, status) as "queued" | "processing" | "completed" | "failed",
      videoUrl,
      error
    };
  }

  /**
   * Create mock provider result
   */
  private createMockResult(
    promptPayload: PromptPayload,
    fallbackReason: string | null,
    mockPreviewUrl: string,
    providerErrorMessage?: string
  ): ProviderResult {
    return {
      id: this.idFactory("mock-result"),
      tenant_id: promptPayload.tenant_id,
      video_job_id: "",
      provider: "mock",
      provider_job_id: this.idFactory("mock-job"),
      raw_status: "mock_completed",
      normalized_status: "completed" as VideoJobStatus,
      result_urls: [mockPreviewUrl],
      error_code: null,
      error_message: null,
      redacted_metadata: {
        adapter: "MockPromptAdapter",
        is_mock: true,
        requested_provider: promptPayload.provider,
        fallback_reason: fallbackReason ?? "mock_provider",
        provider_error: providerErrorMessage ?? null
      },
      received_at: this.now()
    };
  }

  /**
   * Check provider readiness
   */
  getProviderReadiness(): Record<VideoProvider, { ready: boolean; is_mock: boolean }> {
    return {
      mock: { ready: true, is_mock: true },
      pollo: { ready: this.hasCredentials("pollo"), is_mock: !this.hasCredentials("pollo") },
      kling: { ready: this.hasCredentials("kling"), is_mock: !this.hasCredentials("kling") },
      runway: { ready: this.hasCredentials("runway"), is_mock: !this.hasCredentials("runway") }
    };
  }
}

function collectStringUrl(value: unknown, urls: string[]): void {
  if (typeof value === "string" && value.trim() !== "") {
    urls.push(value);
  }
}

function extractResultUrls(provider: VideoProvider, data: Record<string, unknown>): string[] {
  const urls: string[] = [];

  if (provider === "pollo") {
    collectStringUrl(data.url, urls);
    collectStringUrl(data.video_url, urls);
  }

  if (provider === "kling") {
    const video = data.video as Record<string, unknown> | undefined;
    collectStringUrl(video?.url, urls);
    collectStringUrl(data.url, urls);
  }

  if (provider === "runway") {
    const output = data.output as Record<string, unknown> | undefined;
    collectStringUrl(output?.video_url, urls);
    collectStringUrl(data.video_url, urls);
    collectStringUrl(data.url, urls);
  }

  const output = data.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      collectStringUrl(item, urls);
    }
  }

  return Array.from(new Set(urls));
}

/**
 * Create network executor with credentials
 */
export function createNetworkExecutor(options: NetworkExecutorOptions): ProviderNetworkExecutor {
  return new ProviderNetworkExecutor(options);
}

/**
 * Create mock network executor (no live credentials)
 */
export function createMockNetworkExecutor(): ProviderNetworkExecutor {
  return new ProviderNetworkExecutor({
    credentials: {},
    defaultTimeoutMs: 5000,
    fallbackEnabled: true
  });
}
