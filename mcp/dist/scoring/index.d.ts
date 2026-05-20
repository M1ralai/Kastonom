/**
 * MCP Scoring Engine - Module Exports
 * @module mcp/scoring
 * @file MCP-002: Scoring module exports
 */
export { SCORING_WEIGHTS, RECOMMENDATION_THRESHOLD, SALES_VELOCITY_THRESHOLDS, STOCK_MOVEMENT_THRESHOLDS, NEW_PRODUCT_BOOST_CONFIG, TREND_POTENTIAL_DEFAULTS, validateWeights } from "./weights.js";
export type { ScoringWeights, RecommendationThreshold } from "./weights.js";
export { extractSalesVelocity, extractStockMovement, extractNewProductBoost, extractAudienceFit, calculateHypeScore, shouldRecommend, tieBreaker, isValidScore, extractAllScores, salesVelocityFallbackNote, stockMovementFallbackNote } from "./rules.js";
export { ScoringEngine, createScoringEngine, quickScore } from "./scoring-engine.js";
export type { LLMConfig, ScoringEngineOptions } from "./scoring-engine.js";
//# sourceMappingURL=index.d.ts.map