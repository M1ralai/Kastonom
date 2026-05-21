/**
 * MCP Integration Facade - Backend Boundary Interface
 * @module mcp/facade
 * @file MCP-006: Single facade for backend to call MCP capabilities
 * @description Unified interface for backend to access all MCP AI intelligence.
 */
import { createTenantContext, isTenantContext } from "../types/index.js";
// Scoring engine
import { createScoringEngine } from "../scoring/index.js";
// Brief generator
import { generateCreativeBrief } from "../brief-generator/index.js";
// Prompt compiler
import { compilePrompt } from "../prompt-compiler/index.js";
// Iteration engine
import { analyzeMetricsAndSuggest } from "../iteration-engine/index.js";
/**
 * MCP Integration Facade
 * @description Single interface for backend to call all MCP capabilities.
 *              Enforces tenant isolation and provides standardized outputs.
 */
export class MCPIntegrationFacade {
    scoringEngine;
    llmApiKey;
    constructor(options = {}) {
        this.llmApiKey = options.llmApiKey ?? null;
        this.scoringEngine = createScoringEngine({
            llmConfig: options.scoringOptions?.llmConfig
        });
    }
    /**
     * Validate tenant context at facade boundary
     */
    validateTenantContext(context) {
        if (!isTenantContext(context)) {
            throw new Error("Invalid TenantContext provided to MCP facade");
        }
        if (context.status !== "active") {
            throw new Error("Tenant account is not active");
        }
    }
    /**
     * Generate initial campaign scoring and recommendation
     */
    generateInitialCampaign(input) {
        this.validateTenantContext(input.tenantContext);
        return this.scoringEngine.generateScoringOutput(input.tenantContext, input.productMetrics);
    }
    /**
     * Generate creative brief from scoring output
     */
    generateCreativeBrief(input) {
        return generateCreativeBrief(input.scoringOutput, {
            llmApiKey: this.llmApiKey
        });
    }
    /**
     * Compile prompt payload for video provider
     */
    compilePrompt(input, tenantId) {
        const compileOptions = {
            provider: input.provider,
            durationSeconds: input.durationSeconds,
            aspectRatio: input.aspectRatio,
            language: input.language ?? "Turkish"
        };
        return compilePrompt(input.creativeBrief, compileOptions, tenantId, this.llmApiKey);
    }
    /**
     * Generate creative iteration suggestion from ad metrics
     */
    generateIterationSuggestion(input) {
        return analyzeMetricsAndSuggest(input.adMetrics, input.projectId, input.adPublicationId, { llmApiKey: this.llmApiKey });
    }
    /**
     * Check if LLM is available
     */
    isLLMAvailable() {
        return this.llmApiKey !== null && this.llmApiKey.length > 0;
    }
    /**
     * Get LLM availability status
     */
    getLLMStatus() {
        return {
            llm_available: this.isLLMAvailable(),
            llm_used: this.isLLMAvailable()
        };
    }
}
/**
 * Create MCP facade instance
 */
export function createMCPFacade(options) {
    return new MCPIntegrationFacade(options);
}
/**
 * Create facade from demo tenant
 */
export function createDemoMCPFacade() {
    const demoContext = createTenantContext({
        tenantId: "demo-tenant",
        mode: "demo",
        status: "active"
    });
    return createMCPFacade();
}
//# sourceMappingURL=mcp-integration-facade.js.map