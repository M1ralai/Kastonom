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

    const data = await response.json();
    return {
      jobId: data.id,
      status: data.status || "queued"
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

    const data = await response.json();
    return {
      status: data.status,
      videoUrl: data.url,
      error: data.error
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

    const data = await response.json();
    return {
      jobId: data.task_id,
      status: data.task_status
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

    const data = await response.json();
    return {
      status: data.task_status,
      videoUrl: data.video?.url,
      error: data.error
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

    const data = await response.json();
    return {
      jobId: data.id,
      status: data.status || "pending"
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

    const data = await response.json();
    return {
      status: data.status,
      videoUrl: data.output?.video_url,
      error: data.error
    };
  }
}
