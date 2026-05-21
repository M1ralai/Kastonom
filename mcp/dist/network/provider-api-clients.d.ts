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
export declare class PolloAPIClient {
    private config;
    constructor(config: ProviderConfig);
    /**
     * Create video generation job
     */
    createJob(promptText: string, options: {
        durationSeconds: number;
        aspectRatio: string;
        negativePrompt?: string;
    }): Promise<{
        jobId: string;
        status: string;
    }>;
    /**
     * Get job status
     */
    getJobStatus(jobId: string): Promise<{
        status: "queued" | "processing" | "completed" | "failed";
        videoUrl?: string;
        error?: string;
    }>;
}
/**
 * Kling Video O1 client through the Pollo AI platform API.
 * @see https://docs.pollo.ai/m/kling-ai/kling-video-o1
 */
export declare class KlingAPIClient {
    private config;
    constructor(config: ProviderConfig);
    createJob(promptText: string, options: {
        durationSeconds: number;
        aspectRatio: string;
        negativePrompt?: string;
        referenceImages?: string[];
    }): Promise<{
        jobId: string;
        status: string;
    }>;
    getJobStatus(jobId: string): Promise<{
        status: "queued" | "processing" | "completed" | "failed";
        videoUrl?: string;
        error?: string;
    }>;
}
/**
 * Runway API client
 * @see https://docs.runwayml.com
 */
export declare class RunwayAPIClient {
    private config;
    constructor(config: ProviderConfig);
    createJob(promptText: string, options: {
        durationSeconds: number;
        aspectRatio: string;
        negativePrompt?: string;
    }): Promise<{
        jobId: string;
        status: string;
    }>;
    getJobStatus(jobId: string): Promise<{
        status: "queued" | "processing" | "completed" | "failed";
        videoUrl?: string;
        error?: string;
    }>;
}
//# sourceMappingURL=provider-api-clients.d.ts.map