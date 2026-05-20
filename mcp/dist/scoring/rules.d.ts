/**
 * MCP Scoring Engine - Rule-Based Score Extractors
 * @module mcp/scoring/rules
 * @file MCP-002: Pure rule-based scoring functions
 * @description Deterministic score extractors for core metrics.
 *            Same input always produces same output (no side effects).
 */
import type { ProductMetrics } from "../types/index.js";
/**
 * Extract sales velocity score from product metrics
 * @param metrics - Product metrics
 * @returns Sales velocity score (0-100)
 */
export declare function extractSalesVelocity(metrics: ProductMetrics): number;
/**
 * Extract stock movement score from product metrics
 * @param metrics - Product metrics
 * @returns Stock movement score (0-100)
 */
export declare function extractStockMovement(metrics: ProductMetrics): number;
/**
 * Extract new product boost score from product metrics
 * @param metrics - Product metrics
 * @returns New product boost score (0-75)
 */
export declare function extractNewProductBoost(metrics: ProductMetrics): number;
/**
 * Extract audience fit score from product metrics
 * @param metrics - Product metrics
 * @returns Audience fit score (0-100), 0 if no data
 */
export declare function extractAudienceFit(metrics: ProductMetrics): number;
/**
 * Determine fallback note reason for missing sales data
 * @param metrics - Product metrics
 * @returns Fallback note or null
 */
export declare function salesVelocityFallbackNote(metrics: ProductMetrics): string | null;
/**
 * Determine fallback note reason for missing stock data
 * @param metrics - Product metrics
 * @returns Fallback note or null
 */
export declare function stockMovementFallbackNote(metrics: ProductMetrics): string | null;
/**
 * Calculate hype_score from component scores
 * @param salesVelocity - Sales velocity score (0-100)
 * @param trendPotential - Trend potential score (0-100)
 * @param stockMovement - Stock movement score (0-100)
 * @param newProductBoost - New product boost score (0-100)
 * @param audienceFit - Audience fit score (0-100)
 * @returns Hype score (0-100), clamped
 */
export declare function calculateHypeScore(salesVelocity: number, trendPotential: number, stockMovement: number, newProductBoost: number, audienceFit: number): number;
/**
 * Determine if product should be recommended
 * @param hypeScore - Calculated hype score
 * @param threshold - Recommendation threshold (default 65)
 * @returns true if product is recommended
 */
export declare function shouldRecommend(hypeScore: number, threshold?: number): boolean;
/**
 * Generate tie-breaker result for equal scores
 * @param productA - First product ID
 * @param productB - Second product ID
 * @returns -1, 0, or 1 for sorting
 */
export declare function tieBreaker(productA: string, productB: string): number;
/**
 * Validate score bounds
 * @param score - Score value to validate
 * @returns true if valid (0-100)
 */
export declare function isValidScore(score: number): boolean;
/**
 * Extract all scores from metrics (rule-based only)
 * @param metrics - Product metrics
 * @returns Object with all component scores
 */
export declare function extractAllScores(metrics: ProductMetrics): {
    sales_velocity: number;
    stock_movement: number;
    new_product_boost: number;
    audience_fit: number;
    trend_potential: number;
    hype_score: number;
};
//# sourceMappingURL=rules.d.ts.map