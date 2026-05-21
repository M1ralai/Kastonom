/**
 * MCP Integration Facade - Backend Boundary Interface
 * @module mcp/facade
 * @file MCP-006: Single facade for backend to call MCP capabilities
 * @description Unified interface for backend to access all MCP AI intelligence.
 */

import type {
  TenantContext,
  ProductMetrics,
  AIBehaviorOutput,
  CreativeBriefContent,
  PromptPayload,
  AdMetrics,
  CreativeIterationSuggestion,
  VideoProvider
} from "../types/index.js";
import { createTenantContext, isTenantContext } from "../types/index.js";

// Scoring engine
import { createScoringEngine, ScoringEngine, ScoringEngineOptions } from "../scoring/index.js";

// Brief generator
import { generateCreativeBrief, BriefGeneratorOptions } from "../brief-generator/index.js";

// Prompt compiler
import { compilePrompt, CompileOptions } from "../prompt-compiler/index.js";

// Iteration engine
import { analyzeMetricsAndSuggest, IterationEngineOptions } from "../iteration-engine/index.js";

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
export class MCPIntegrationFacade {
  private scoringEngine: ScoringEngine;
  private llmApiKey: string | null;

  constructor(options: MCPFacadeOptions = {}) {
    this.llmApiKey = options.llmApiKey ?? null;
    this.scoringEngine = createScoringEngine({
      llmConfig: options.scoringOptions?.llmConfig
    });
  }

  /**
   * Validate tenant context at facade boundary
   */
  private validateTenantContext(context: TenantContext): void {
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
  generateInitialCampaign(input: GenerateInitialCampaignInput): AIBehaviorOutput {
    this.validateTenantContext(input.tenantContext);

    return this.scoringEngine.generateScoringOutput(
      input.tenantContext,
      input.productMetrics
    );
  }

  /**
   * Generate creative brief from scoring output
   */
  generateCreativeBrief(input: GenerateCreativeBriefInput): CreativeBriefContent {
    return generateCreativeBrief(input.scoringOutput, {
      llmApiKey: this.llmApiKey
    });
  }

  /**
   * Compile prompt payload for video provider
   */
  compilePrompt(input: CompilePromptInput, tenantId: string): PromptPayload {
    const compileOptions: CompileOptions = {
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
  generateIterationSuggestion(input: IterateCampaignInput): {
    suggestion: Omit<CreativeIterationSuggestion, "id" | "created_at" | "updated_at" | "tenant_id">;
    fallback_notes: string[];
  } {
    return analyzeMetricsAndSuggest(
      input.adMetrics,
      input.projectId,
      input.adPublicationId,
      { llmApiKey: this.llmApiKey }
    );
  }

  /**
   * Check if LLM is available
   */
  isLLMAvailable(): boolean {
    return this.llmApiKey !== null && this.llmApiKey.length > 0;
  }

  /**
   * Get LLM availability status
   */
  getLLMStatus(): { llm_available: boolean; llm_used: boolean } {
    return {
      llm_available: this.isLLMAvailable(),
      llm_used: this.isLLMAvailable()
    };
  }
}

/**
 * Create MCP facade instance
 */
export function createMCPFacade(options?: MCPFacadeOptions): MCPIntegrationFacade {
  return new MCPIntegrationFacade(options);
}

/**
 * Create facade from demo tenant
 */
export function createDemoMCPFacade(): MCPIntegrationFacade {
  const demoContext = createTenantContext({
    tenantId: "demo-tenant",
    mode: "demo",
    status: "active"
  });

  return createMCPFacade();
}
