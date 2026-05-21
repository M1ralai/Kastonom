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

function normalizeClientStatus(value: unknown, fallback: ClientStatus = "queued"): ClientStatus {
  const status = String(value ?? fallback).toLowerCase();

  if (status === "completed" || status === "done" || status === "succeed") {
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
 * Kling API client
 * @see https://docs.klingai.com
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
  }): Promise<{ jobId: string; status: string }> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/videos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.config.apiKey
      },
      body: JSON.stringify({
        text: promptText,
        negative_text: options.negativePrompt,
        duration: options.durationSeconds,
        aspect_ratio: options.aspectRatio,
        model_id: "kling-video-v1"
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Kling API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as Record<string, unknown>;
    return {
      jobId: String(data.task_id ?? ""),
      status: String(data.task_status || "queued")
    };
  }

  async getJobStatus(jobId: string): Promise<{
    status: "queued" | "processing" | "completed" | "failed";
    videoUrl?: string;
    error?: string;
  }> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/videos/${jobId}`, {
      headers: {
        "X-API-Key": this.config.apiKey
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Kling API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as Record<string, unknown>;
    const video = data.video as Record<string, unknown> | undefined;
    return {
      status: normalizeClientStatus(data.task_status),
      videoUrl: video?.url ? String(video.url) : undefined,
      error: data.error ? String(data.error) : undefined
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
