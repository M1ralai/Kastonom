/**
 * MCP/AI Intelligence Layer for Kastonom
 * @module mcp
 * @file Main entry point for MCP layer
 * @description Exports all MCP modules for backend integration.
 */

// Types
export * from "./types/index.js";

// Scoring Engine
export { createScoringEngine, quickScore, ScoringEngine } from "./scoring/index.js";
export { extractSalesVelocity, extractStockMovement, extractNewProductBoost } from "./scoring/rules.js";
export { SCORING_WEIGHTS, RECOMMENDATION_THRESHOLD } from "./scoring/weights.js";

// Brief Generator
export { generateCreativeBrief, generateBriefWithContext, validateContent } from "./brief-generator/index.js";

// Prompt Compiler
export { createMockPromptAdapter, createPolloPromptAdapter, compilePrompt } from "./prompt-compiler/index.js";

// Iteration Engine
export { analyzeMetricsAndSuggest, getAlternativeAngles } from "./iteration-engine/index.js";

// Facade
export { createMCPFacade, createDemoMCPFacade, MCPIntegrationFacade } from "./facade/index.js";

// Network
export { createMockNetworkExecutor, ProviderNetworkExecutor } from "./network/index.js";

// Version info
export const MCP_VERSION = "1.0.0";
export const MCP_LAYER = "mcp_ai";
