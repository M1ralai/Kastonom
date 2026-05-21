/**
 * MCP/AI Intelligence Layer for Kastonom
 * @module mcp
 * @file Main entry point for MCP layer
 * @description Exports all MCP modules for backend integration.
 */
export * from "./types/index.js";
export { createScoringEngine, quickScore, ScoringEngine } from "./scoring/index.js";
export { extractSalesVelocity, extractStockMovement, extractNewProductBoost } from "./scoring/rules.js";
export { SCORING_WEIGHTS, RECOMMENDATION_THRESHOLD } from "./scoring/weights.js";
export { generateCreativeBrief, generateBriefWithContext, validateContent } from "./brief-generator/index.js";
export { createMockPromptAdapter, createPolloPromptAdapter, compilePrompt } from "./prompt-compiler/index.js";
export { analyzeMetricsAndSuggest, getAlternativeAngles } from "./iteration-engine/index.js";
export { createMCPFacade, createDemoMCPFacade, MCPIntegrationFacade } from "./facade/index.js";
export { createNetworkExecutor, createMockNetworkExecutor, ProviderNetworkExecutor } from "./network/index.js";
export declare const MCP_VERSION = "1.0.0";
export declare const MCP_LAYER = "mcp_ai";
//# sourceMappingURL=index.d.ts.map