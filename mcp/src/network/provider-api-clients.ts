/**
 * Real AI Provider API Clients
 * @module mcp/network
 * @file MCP-007: Real provider API implementations
 * @description Live API clients for Pollo, Kling, Runway
 */

/**
 * Base provider config
 */
export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs?: number;
}

type ClientStatus = "queued" | "processing" | "completed" | "failed";

const POLLO_PLATFORM_ROOT = "/api/platform";
const KLING_VIDEO_O1_GENERATION_PATH = "/generation/kling-ai/kling-video-o1";

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

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
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

function normalizeClientStatus(value: unknown, fallback: ClientStatus = "queued"): ClientStatus {
  const status = String(value ?? fallback).toLowerCase();

  if (status === "completed" || status === "done" || status === "succeed" || status === "success") {
    return "completed";
  }
  if (status === "failed" || status === "error") {
    return "failed";
  }
  if (status === "processing" || status === "generating" || status === "running") {
    return "processing";
  }

  return "queued";
}

/**
 * Pollo API client
 * @see https://docs.pollo.com
 */
export class PolloAPIClient {
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = {
      timeoutMs: 60000,
      ...config
    };
  }

  /**
   * Create video generation job
   */
  async createJob(promptText: string, options: {
    durationSeconds: number;
    aspectRatio: string;
    negativePrompt?: string;
  }): Promise<{ jobId: string; status: string }> {
    const response = await fetch(`${this.config.baseUrl}/v1/videos/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        prompt: promptText,
        negative_prompt: options.negativePrompt,
        duration: options.durationSeconds,
        aspect_ratio: options.aspectRatio,
        model: "pollo-v1"
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pollo API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as Record<string, unknown>;
    return {
      jobId: String(data.id ?? ""),
      status: String(data.status || "queued")
    };
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<{
    status: "queued" | "processing" | "completed" | "failed";
    videoUrl?: string;
    error?: string;
  }> {
    const response = await fetch(`${this.config.baseUrl}/v1/videos/${jobId}`, {
      headers: {
        "Authorization": `Bearer ${this.config.apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pollo API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as Record<string, unknown>;
    return {
      status: normalizeClientStatus(data.status),
      videoUrl: data.url ? String(data.url) : undefined,
      error: data.error ? String(data.error) : undefined
    };
  }
}

/**
 * Kling Video O1 client through the Pollo AI platform API.
 * @see https://docs.pollo.ai/m/kling-ai/kling-video-o1
 */
export class KlingAPIClient {
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = {
      timeoutMs: 90000,
      ...config
    };
  }

  async createJob(promptText: string, options: {
    durationSeconds: number;
    aspectRatio: string;
    negativePrompt?: string;
    referenceImages?: string[];
  }): Promise<{ jobId: string; status: string }> {
    const referenceImages = (options.referenceImages ?? [])
      .map((image) => image.trim())
      .filter((image) => image.startsWith("https://"));

    if (referenceImages.length === 0) {
      throw new Error("Kling Video O1 requires at least one HTTPS reference image.");
    }

    const response = await fetch(buildPolloPlatformUrl(this.config.baseUrl, KLING_VIDEO_O1_GENERATION_PATH), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey
      },
      body: JSON.stringify({
        input: {
          images: Array.from(new Set(referenceImages)),
          prompt: promptText,
          aspectRatio: normalizeKlingAspectRatio(options.aspectRatio),
          length: normalizeKlingLength(options.durationSeconds),
          mode: "pro"
        },
        clientSource: "kastonom-mcp"
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Kling API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as Record<string, unknown>;
    const body = providerData(data);
    const jobId = firstString(body.taskId, body.task_id, body.id, data.taskId, data.task_id, data.id);
    if (!jobId) {
      throw new Error("Kling API response did not include a task id.");
    }

    return {
      jobId,
      status: firstString(body.status, body.task_status, data.status, data.task_status) ?? "queued"
    };
  }

  async getJobStatus(jobId: string): Promise<{
    status: "queued" | "processing" | "completed" | "failed";
    videoUrl?: string;
    error?: string;
  }> {
    const response = await fetch(buildPolloPlatformUrl(this.config.baseUrl, `/generation/${encodeURIComponent(jobId)}/status`), {
      headers: {
        "x-api-key": this.config.apiKey
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Kling API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as Record<string, unknown>;
    
    // Handle nested result array structure: { result: [{ status, videoUrl, ... }] }
    const resultArray = data.result as unknown[] | undefined;
    const firstResult = Array.isArray(resultArray) && resultArray.length > 0 
      ? resultArray[0] as Record<string, unknown>
      : undefined;
    
    // Extract status and videoUrl from first result item
    const resultStatus = firstString(firstResult?.status, data.status);
    const resultVideoUrl = firstString(firstResult?.videoUrl, firstResult?.url, data.videoUrl, data.url);
    const resultError = firstString(firstResult?.failMsg, firstResult?.fail_message, data.failMsg, data.error);
    
    // If we have a videoUrl, consider it completed even if status is unknown
    const finalStatus = resultVideoUrl 
      ? normalizeClientStatus(resultStatus ?? "completed")
      : normalizeClientStatus(resultStatus ?? "queued");
    
    return {
      status: finalStatus,
      videoUrl: resultVideoUrl,
      error: resultError
    };
  }
}

/**
 * Runway API client
 * @see https://docs.runwayml.com
 */
export class RunwayAPIClient {
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = {
      timeoutMs: 120000,
      ...config
    };
  }

  async createJob(promptText: string, options: {
    durationSeconds: number;
    aspectRatio: string;
    negativePrompt?: string;
  }): Promise<{ jobId: string; status: string }> {
    const response = await fetch(`${this.config.baseUrl}/v1/text_to_video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        prompt: promptText,
        negative_prompt: options.negativePrompt,
        duration: options.durationSeconds,
        aspect_ratio: options.aspectRatio,
        model: "gen3a_turbo"
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Runway API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as Record<string, unknown>;
    return {
      jobId: String(data.id ?? ""),
      status: String(data.status || "pending")
    };
  }

  async getJobStatus(jobId: string): Promise<{
    status: "queued" | "processing" | "completed" | "failed";
    videoUrl?: string;
    error?: string;
  }> {
    const response = await fetch(`${this.config.baseUrl}/v1/text_to_video/${jobId}`, {
      headers: {
        "Authorization": `Bearer ${this.config.apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Runway API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as Record<string, unknown>;
    const output = data.output as Record<string, unknown> | undefined;
    return {
      status: normalizeClientStatus(data.status),
      videoUrl: output?.video_url ? String(output.video_url) : undefined,
      error: data.error ? String(data.error) : undefined
    };
  }
}
