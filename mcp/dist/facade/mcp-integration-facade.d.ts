/**
 * MCP Integration Facade - Backend Boundary Interface
 * @module mcp/facade
 * @file MCP-006: Single facade for backend to call MCP capabilities
 * @description Unified interface for backend to access all MCP AI intelligence.
 */
import type { TenantContext, ProductMetrics, AIBehaviorOutput, CreativeBriefContent, PromptPayload, AdMetrics, CreativeIterationSuggestion, VideoProvider } from "../types/index.js";
import { ScoringEngineOptions } from "../scoring/index.js";
import { BriefGeneratorOptions } from "../brief-generator/index.js";
import { IterationEngineOptions } from "../iteration-engine/index.js";
/**
 * MCP Facade options
 */
export interface MCPFacadeOptions {
    llmApiKey?: string | null;
    scoringOptions?: ScoringEngineOptions;
    briefOptions?: BriefGeneratorOptions;
    iterationOptions?: IterationEngineOptions;
}
/**
 * Generate initial campaign scoring output
 */
export interface GenerateInitialCampaignInput {
    tenantContext: TenantContext;
    productId: string;
    productMetrics: ProductMetrics;
}
/**
 * Generate creative brief input
 */
export interface GenerateCreativeBriefInput {
    scoringOutput: AIBehaviorOutput;
}
/**
 * Compile prompt input
 */
export interface CompilePromptInput {
    creativeBrief: CreativeBriefContent;
    provider: VideoProvider;
    durationSeconds: number;
    aspectRatio: "9:16" | "1:1" | "4:5" | "16:9" | "unknown";
    language?: string;
}
/**
 * Iterate campaign input
 */
export interface IterateCampaignInput {
    adMetrics: AdMetrics;
    projectId: string;
    adPublicationId: string;
}
/**
 * MCP Integration Facade
 * @description Single interface for backend to call all MCP capabilities.
 *              Enforces tenant isolation and provides standardized outputs.
 */
export declare class MCPIntegrationFacade {
    private scoringEngine;
    private llmApiKey;
    constructor(options?: MCPFacadeOptions);
    /**
     * Validate tenant context at facade boundary
     */
    private validateTenantContext;
    /**
     * Generate initial campaign scoring and recommendation
     */
    generateInitialCampaign(input: GenerateInitialCampaignInput): AIBehaviorOutput;
    /**
     * Generate creative brief from scoring output
     */
    generateCreativeBrief(input: GenerateCreativeBriefInput): CreativeBriefContent;
    /**
     * Compile prompt payload for video provider
     */
    compilePrompt(input: CompilePromptInput, tenantId: string): PromptPayload;
    /**
     * Generate creative iteration suggestion from ad metrics
     */
    generateIterationSuggestion(input: IterateCampaignInput): {
        suggestion: Omit<CreativeIterationSuggestion, "id" | "created_at" | "updated_at" | "tenant_id">;
        fallback_notes: string[];
    };
    /**
     * Check if LLM is available
     */
    isLLMAvailable(): boolean;
    /**
     * Get LLM availability status
     */
    getLLMStatus(): {
        llm_available: boolean;
        llm_used: boolean;
    };
}
/**
 * Create MCP facade instance
 */
export declare function createMCPFacade(options?: MCPFacadeOptions): MCPIntegrationFacade;
/**
 * Create facade from demo tenant
 */
export declare function createDemoMCPFacade(): MCPIntegrationFacade;
//# sourceMappingURL=mcp-integration-facade.d.ts.map