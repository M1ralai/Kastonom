/**
 * MCP Network - Provider Network Executor
 * @module mcp/network
 * @file MCP-007: Direct provider API execution from MCP layer
 * @description Send prompt payloads to live video provider APIs.
 */

import type { PromptPayload, ProviderResult, VideoProvider, VideoJobStatus } from "../types/index.js";

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

const POLLO_PLATFORM_ROOT = "/api/platform";
const KLING_VIDEO_V3_GENERATION_PATH = "/generation/kling-ai/kling-v3";

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

function buildPolloPlatformUrl(baseUrl: string, path: string): string {
  const base = trimTrailingSlashes(baseUrl);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (base.endsWith(POLLO_PLATFORM_ROOT)) {
    return `${base}${normalizedPath}`;
  }

  return `${base}${POLLO_PLATFORM_ROOT}${normalizedPath}`;
}

function getStringOption(options: Record<string, unknown>, key: string): string | undefined {
  const value = options[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function getNumberOption(options: Record<string, unknown>, key: string): number | undefined {
  const value = options[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getStringArrayOption(options: Record<string, unknown>, key: string): string[] {
  const value = options[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.startsWith("https://"));
}

function getHttpsStringOption(options: Record<string, unknown>, key: string): string[] {
  const value = getStringOption(options, key);
  return value?.startsWith("https://") ? [value] : [];
}

function normalizeKlingAspectRatio(value: string): "16:9" | "9:16" | "1:1" {
  if (value === "16:9" || value === "9:16" || value === "1:1") {
    return value;
  }

  return "9:16";
}

function normalizeKlingLength(value: number): number {
  const roundedValue = Math.round(value);
  return Math.min(15, Math.max(3, roundedValue));
}

function stripUndefinedValues(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function providerData(data: Record<string, unknown>): Record<string, unknown> {
  return objectValue(data.data)
    ?? objectValue(data.result)
    ?? objectValue(data.task)
    ?? data;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return undefined;
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

  constructor(options: NetworkExecutorOptions) {
    this.credentials = options.credentials;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 30000;
    this.fallbackEnabled = options.fallbackEnabled ?? false;
    this.mockPreviewUrl = options.mockPreviewUrl ?? "/demo-assets/mock-ad-preview.mp4";
    this.idFactory = options.idFactory ?? ((prefix: string) => `${prefix}-${Date.now()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  /**
   * Check if provider credentials are available
   */
  hasCredentials(provider: VideoProvider): boolean {
    return this.getProviderConfig(provider) !== null;
  }

  /**
   * Get credentials for provider
   */
  private getProviderConfig(provider: VideoProvider): ProviderAPIConfig | null {
    const cred = this.credentials;
    // Type-safe access for non-mock providers only
    if (provider === "pollo" && cred.pollo?.apiKey && cred.pollo?.baseUrl) {
      return cred.pollo;
    }
    if (provider === "kling" && cred.kling?.apiKey && cred.kling?.baseUrl) {
      return cred.kling;
    }
    if (provider === "kling" && cred.pollo?.apiKey && cred.pollo?.baseUrl) {
      return cred.pollo;
    }
    if (provider === "runway" && cred.runway?.apiKey && cred.runway?.baseUrl) {
      return cred.runway;
    }
    return null;
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
    
    // PRETEND MODE: Always return mock result instantly
    // This makes the video generation "instant" for demo purposes
    const isMockRequest = promptPayload.is_mock === true;
    if (isMockRequest) {
      return this.generateMockResult(promptPayload, "pretend_mode_mock");
    }
    
    // For live providers, check credentials
    const config = this.getProviderConfig(provider);
    if (!config) {
      // Check if fallback is enabled - if so, return mock result
      if (options.fallbackEnabled ?? this.fallbackEnabled) {
        return this.generateMockResult(promptPayload, "provider_config_fallback");
      }
      const error = new Error(`${provider} provider configuration is missing.`);
      (error as Error & { code?: string; fallbackAvailable?: boolean }).code = "PROVIDER_CONFIG_MISSING";
      (error as Error & { code?: string; fallbackAvailable?: boolean }).fallbackAvailable = false;
      throw error;
    }

    // Execute real API call based on provider
    const result = await this.callProviderAPI(provider, promptPayload);
    return result;
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
      this.getProviderSubmissionUrl(provider, config.baseUrl),
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
    const body = providerData(data);

    // Extract job ID based on provider response format
    if (provider === "pollo") {
      jobId = firstString(body.id, data.id) ?? "";
      status = firstString(body.status, data.status) ?? "queued";
    } else if (provider === "kling") {
      jobId = firstString(body.taskId, body.task_id, body.id, data.taskId, data.task_id, data.id) ?? "";
      status = firstString(body.status, body.task_status, data.status, data.task_status) ?? "queued";
    } else {
      // Runway
      jobId = firstString(body.id, data.id) ?? "";
      status = firstString(body.status, data.status) ?? "pending";
    }

    if (jobId === "") {
      throw new Error(`${provider} API response did not include a task id.`);
    }

    const resultUrls = extractResultUrls(provider, body, data);

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
        provider_gateway: provider === "kling" ? "pollo.ai" : provider,
        model: provider === "kling" ? "kling-v3" : undefined,
        is_mock: false
      },
      received_at: this.now()
    };
  }

  /**
   * Get provider-specific submission URL
   */
  private getProviderSubmissionUrl(provider: VideoProvider, baseUrl: string): string {
    const trimmedBaseUrl = trimTrailingSlashes(baseUrl);

    if (provider === "pollo") {
      return `${trimmedBaseUrl}/v1/videos/generate`;
    }

    if (provider === "kling") {
      return buildPolloPlatformUrl(baseUrl, KLING_VIDEO_V3_GENERATION_PATH);
    }

    return `${trimmedBaseUrl}/v1/text_to_video`;
  }

  /**
   * Get provider-specific status URL
   */
  private getProviderStatusUrl(provider: VideoProvider, baseUrl: string, providerJobId: string): string {
    const trimmedBaseUrl = trimTrailingSlashes(baseUrl);
    const encodedProviderJobId = encodeURIComponent(providerJobId);

    if (provider === "pollo") {
      return `${trimmedBaseUrl}/v1/videos/${encodedProviderJobId}`;
    }

    if (provider === "kling") {
      return buildPolloPlatformUrl(baseUrl, `/generation/${encodedProviderJobId}/status`);
    }

    return `${trimmedBaseUrl}/v1/text_to_video/${encodedProviderJobId}`;
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
      headers["x-api-key"] = apiKey;
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
      const providerOptions = promptPayload.provider_options ?? {};
      
      // Kling v3 uses single "image" field, not "images" array
      const imageUrl = 
        getHttpsStringOption(providerOptions, "image")[0] ??
        getStringArrayOption(providerOptions, "reference_images")[0] ??
        getStringArrayOption(providerOptions, "images")[0];

      if (!imageUrl) {
        throw new Error("Kling v3 requires an image URL in provider_options.image");
      }

      const input = stripUndefinedValues({
        image: imageUrl,
        prompt: promptPayload.prompt_text,
        negativePrompt: options.negativePrompt,
        aspectRatio: normalizeKlingAspectRatio(options.aspectRatio),
        length: normalizeKlingLength(getNumberOption(providerOptions, "length") ?? options.durationSeconds),
        mode: getStringOption(providerOptions, "mode") ?? "pro",
        generateAudio: getStringOption(providerOptions, "generateAudio") !== "false"
      });

      return stripUndefinedValues({
        input,
        webhookUrl: getStringOption(providerOptions, "webhookUrl"),
        clientSource: getStringOption(providerOptions, "clientSource") ?? "kastonom-mcp"
      });
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

    const response = await fetch(this.getProviderStatusUrl(provider, config.baseUrl, providerJobId), {
      headers: this.getProviderHeaders(provider, config.apiKey)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`${provider} status check error: ${response.status} - ${error}`);
    }

    const data = await response.json() as Record<string, unknown>;
    const body = providerData(data);

    // Extract status and URL based on provider response format
    let status: string;
    let videoUrl: string | undefined;
    let error: string | undefined;

    if (provider === "pollo") {
      status = firstString(body.status, data.status) ?? "queued";
      videoUrl = firstString(body.url, body.video_url, data.url, data.video_url);
      error = firstString(body.error, data.error);
    } else if (provider === "kling") {
      // Kling v3 response format: { result: [{ status, videoUrl, failMsg }] }
      const resultArray = data.result as unknown[] | undefined;
      const firstResult = Array.isArray(resultArray) && resultArray.length > 0 
        ? resultArray[0] as Record<string, unknown> 
        : undefined;
      
      // Also check legacy formats
      const generation = selectGeneration(body.generations ?? data.generations);
      const video = objectValue(body.video) ?? objectValue(data.video);
      
      // Extract video URL from various possible locations
      videoUrl = firstString(
        firstResult?.videoUrl,
        firstResult?.url,
        generation?.url,
        video?.url, 
        body.url, 
        data.url
      );
      
      // Extract error message
      error = firstString(
        firstResult?.failMsg,
        firstResult?.fail_message,
        generation?.failMsg, 
        body.failMsg, 
        data.failMsg, 
        body.error, 
        data.error
      );
      
      // Extract status - if we have a videoUrl, consider it completed
      status = firstString(
        firstResult?.status,
        generation?.status,
        videoUrl ? "completed" : undefined,
        body.status,
        body.task_status,
        data.status,
        data.task_status
      ) ?? "queued";
    } else {
      // Runway
      status = firstString(body.status, data.status) ?? "pending";
      const output = objectValue(body.output) ?? objectValue(data.output);
      videoUrl = firstString(output?.video_url, body.video_url, body.url, data.video_url, data.url);
      error = firstString(body.error, data.error);
    }

    return {
      status: mapProviderStatus(provider, status) as "queued" | "processing" | "completed" | "failed",
      videoUrl,
      error
    };
  }

  /**
   * Generate mock result when credentials are missing and fallback is enabled
   */
  private generateMockResult(
    promptPayload: PromptPayload,
    fallbackReason: string
  ): ProviderResult {
    return {
      id: this.idFactory("provider-result"),
      tenant_id: promptPayload.tenant_id,
      video_job_id: "",
      provider: promptPayload.provider,
      provider_job_id: this.idFactory("mock-job"),
      raw_status: "completed",
      normalized_status: "completed",
      result_urls: [this.mockPreviewUrl],
      error_code: null,
      error_message: null,
      redacted_metadata: {
        adapter: `${promptPayload.provider}-prompt-adapter`,
        provider_gateway: promptPayload.provider,
        is_mock: true,
        fallback_reason: fallbackReason,
        fallback_enabled: true
      },
      received_at: this.now()
    };
  }

  /**
   * Check provider readiness
   */
  getProviderReadiness(): Record<VideoProvider, { ready: boolean; is_mock: boolean }> {
    return {
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

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function selectGeneration(value: unknown): Record<string, unknown> | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  for (const item of value) {
    if (item && typeof item === "object" && "url" in item) {
      return item as Record<string, unknown>;
    }
  }

  const firstItem = value[0];
  return firstItem && typeof firstItem === "object"
    ? firstItem as Record<string, unknown>
    : undefined;
}

function extractResultUrls(
  provider: VideoProvider,
  data: Record<string, unknown>,
  rawData: Record<string, unknown> = data
): string[] {
  const urls: string[] = [];

  if (provider === "pollo") {
    collectStringUrl(data.url, urls);
    collectStringUrl(data.video_url, urls);
    collectStringUrl(rawData.url, urls);
    collectStringUrl(rawData.video_url, urls);
  }

  if (provider === "kling") {
    // Check Kling v3 format: data.result is an array of { videoUrl, status }
    const resultArray = data.result as unknown[] | undefined;
    if (Array.isArray(resultArray) && resultArray.length > 0) {
      for (const item of resultArray) {
        if (item && typeof item === "object") {
          const resultItem = item as Record<string, unknown>;
          collectStringUrl(resultItem.videoUrl, urls);
          collectStringUrl(resultItem.url, urls);
        }
      }
    }
    
    // Legacy format checks
    const video = objectValue(data.video) ?? objectValue(rawData.video);
    collectStringUrl(video?.url, urls);
    collectStringUrl(data.url, urls);
    collectStringUrl(rawData.url, urls);

    const generations = Array.isArray(data.generations)
      ? data.generations
      : Array.isArray(rawData.generations)
      ? rawData.generations
      : [];
    if (generations.length > 0) {
      for (const generation of generations) {
        if (generation && typeof generation === "object") {
          collectStringUrl((generation as Record<string, unknown>).url, urls);
        }
      }
    }
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
