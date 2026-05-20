/**
 * MCP Network - Provider Network Executor
 * @module mcp/network
 * @file MCP-007: Direct provider API execution from MCP layer
 * @description Send prompt payloads to live video provider APIs.
 */
/**
 * Provider network executor
 * @description Execute HTTP requests to live video provider APIs.
 */
export class ProviderNetworkExecutor {
    credentials;
    defaultTimeoutMs;
    constructor(options) {
        this.credentials = options.credentials;
        this.defaultTimeoutMs = options.defaultTimeoutMs ?? 30000;
    }
    /**
     * Check if provider credentials are available
     */
    hasCredentials(provider) {
        if (provider === "mock") {
            return true;
        }
        const cred = this.credentials;
        return cred[provider] !== undefined;
    }
    /**
     * Get credentials for provider (only call for non-mock providers)
     */
    getProviderConfig(provider) {
        if (provider === "mock") {
            return null;
        }
        const cred = this.credentials;
        // Type-safe access for non-mock providers only
        if (provider === "pollo")
            return cred.pollo ?? null;
        if (provider === "kling")
            return cred.kling ?? null;
        if (provider === "runway")
            return cred.runway ?? null;
        return null;
    }
    /**
     * Execute provider submission (placeholder for actual HTTP calls)
     * @param promptPayload - Compiled prompt payload
     * @returns Normalized provider result
     */
    async executeSubmission(promptPayload) {
        const provider = promptPayload.provider;
        // If mock provider, return mock result
        if (provider === "mock") {
            return this.createMockResult(promptPayload);
        }
        // For live providers, check credentials
        const config = this.getProviderConfig(provider);
        if (!config) {
            // No credentials, return mock result with fallback reason
            return this.createMockResult(promptPayload);
        }
        // For live providers, return placeholder (actual HTTP implementation would go here)
        // In production, this would use fetch or axios to call provider APIs
        throw new Error(`Live provider execution not implemented in this MVP. ` +
            `Use mock provider or implement MCP-007 network layer for ${provider}.`);
    }
    /**
     * Create mock provider result
     */
    createMockResult(promptPayload) {
        return {
            id: `mock-result-${Date.now()}`,
            tenant_id: promptPayload.tenant_id,
            video_job_id: "",
            provider: "mock",
            provider_job_id: `mock-job-${Date.now()}`,
            raw_status: "mock_completed",
            normalized_status: "completed",
            result_urls: ["/demo-assets/mock-ad-preview.mp4"],
            error_code: null,
            error_message: null,
            redacted_metadata: {
                adapter: "MockPromptAdapter",
                is_mock: true,
                fallback_reason: promptPayload.fallback_reason
            },
            received_at: new Date().toISOString()
        };
    }
    /**
     * Check provider readiness
     */
    getProviderReadiness() {
        return {
            mock: { ready: true, is_mock: true },
            pollo: { ready: this.credentials.pollo !== undefined, is_mock: this.credentials.pollo === undefined },
            kling: { ready: this.credentials.kling !== undefined, is_mock: this.credentials.kling === undefined },
            runway: { ready: this.credentials.runway !== undefined, is_mock: this.credentials.runway === undefined }
        };
    }
}
/**
 * Create network executor with credentials
 */
export function createNetworkExecutor(options) {
    return new ProviderNetworkExecutor(options);
}
/**
 * Create mock network executor (no live credentials)
 */
export function createMockNetworkExecutor() {
    return new ProviderNetworkExecutor({
        credentials: {},
        defaultTimeoutMs: 5000
    });
}
//# sourceMappingURL=provider-network-executor.js.map