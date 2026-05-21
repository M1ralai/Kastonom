/**
 * Real AI Provider API Clients
 * @module mcp/network
 * @file MCP-007: Real provider API implementations
 * @description Live API clients for Pollo, Kling, Runway
 */
function normalizeClientStatus(value, fallback = "queued") {
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
    config;
    constructor(config) {
        this.config = {
            timeoutMs: 60000,
            ...config
        };
    }
    /**
     * Create video generation job
     */
    async createJob(promptText, options) {
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
            jobId: String(data.id ?? ""),
            status: String(data.status || "queued")
        };
    }
    /**
     * Get job status
     */
    async getJobStatus(jobId) {
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
    config;
    constructor(config) {
        this.config = {
            timeoutMs: 90000,
            ...config
        };
    }
    async createJob(promptText, options) {
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
            jobId: String(data.task_id ?? ""),
            status: String(data.task_status || "queued")
        };
    }
    async getJobStatus(jobId) {
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
        const video = data.video;
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
    config;
    constructor(config) {
        this.config = {
            timeoutMs: 120000,
            ...config
        };
    }
    async createJob(promptText, options) {
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
            jobId: String(data.id ?? ""),
            status: String(data.status || "pending")
        };
    }
    async getJobStatus(jobId) {
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
        const output = data.output;
        return {
            status: normalizeClientStatus(data.status),
            videoUrl: output?.video_url ? String(output.video_url) : undefined,
            error: data.error ? String(data.error) : undefined
        };
    }
}
//# sourceMappingURL=provider-api-clients.js.map