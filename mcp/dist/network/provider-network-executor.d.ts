/**
 * MCP Network - Provider Network Executor
 * @module mcp/network
 * @file MCP-007: Direct provider API execution from MCP layer
 * @description Send prompt payloads to live video provider APIs.
 */
import type { PromptPayload, ProviderResult, VideoProvider } from "../types/index.js";
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
 * Provider network executor
 * @description Execute HTTP requests to live video provider APIs.
 */
export declare class ProviderNetworkExecutor {
    private credentials;
    private defaultTimeoutMs;
    private fallbackEnabled;
    private mockPreviewUrl;
    private idFactory;
    private now;
    constructor(options: NetworkExecutorOptions);
    /**
     * Check if provider credentials are available
     */
    hasCredentials(provider: VideoProvider): boolean;
    /**
     * Get credentials for provider
     */
    private getProviderConfig;
    /**
     * Execute provider submission with real API call
     * @param promptPayload - Compiled prompt payload
     * @returns Normalized provider result
     */
    executeSubmission(promptPayload: PromptPayload, options?: ProviderExecutionOptions): Promise<ProviderResult>;
    /**
     * Call provider API based on provider type
     */
    private callProviderAPI;
    /**
     * Get provider-specific submission URL
     */
    private getProviderSubmissionUrl;
    /**
     * Get provider-specific status URL
     */
    private getProviderStatusUrl;
    /**
     * Get provider-specific headers
     */
    private getProviderHeaders;
    /**
     * Build provider-specific payload
     */
    private buildProviderPayload;
    /**
     * Get job status from provider
     */
    getJobStatus(provider: VideoProvider, providerJobId: string): Promise<{
        status: "queued" | "processing" | "completed" | "failed";
        videoUrl?: string;
        error?: string;
    }>;
    /**
     * Generate mock result when credentials are missing and fallback is enabled
     */
    private generateMockResult;
    /**
     * Check provider readiness
     */
    getProviderReadiness(): Record<VideoProvider, {
        ready: boolean;
        is_mock: boolean;
    }>;
}
/**
 * Create network executor with credentials
 */
export declare function createNetworkExecutor(options: NetworkExecutorOptions): ProviderNetworkExecutor;
/**
 * Create mock network executor (no live credentials)
 */
export declare function createMockNetworkExecutor(): ProviderNetworkExecutor;
//# sourceMappingURL=provider-network-executor.d.ts.map