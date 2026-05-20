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
}
/**
 * Provider network executor
 * @description Execute HTTP requests to live video provider APIs.
 */
export declare class ProviderNetworkExecutor {
    private credentials;
    private defaultTimeoutMs;
    constructor(options: NetworkExecutorOptions);
    /**
     * Check if provider credentials are available
     */
    hasCredentials(provider: VideoProvider): boolean;
    /**
     * Get credentials for provider (only call for non-mock providers)
     */
    private getProviderConfig;
    /**
     * Execute provider submission (placeholder for actual HTTP calls)
     * @param promptPayload - Compiled prompt payload
     * @returns Normalized provider result
     */
    executeSubmission(promptPayload: PromptPayload): Promise<ProviderResult>;
    /**
     * Create mock provider result
     */
    private createMockResult;
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