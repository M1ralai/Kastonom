/**
 * MCP Scoring Engine - Weight Constants
 * @module mcp/scoring/weights
 * @file MCP-002: Scoring weight constants
 * @description Explicit scoring weights with business rationale.
 *            All weights documented for audit and adjustment.
 */
/**
 * Scoring weights for hype_score calculation
 * @description Weights determine how each component contributes to final hype_score.
 *            Formula: hype_score = weighted_sum(scores) clamped to [0, 100]
 *
 * Rationale:
 * - sales_velocity: Most important signal for advertising momentum
 * - trend_potential: Important for capturing trend alignment
 * - stock_movement: Indicates inventory opportunity
 * - new_product_boost: Rewards new product launches
 * - audience_fit: Aligns product with target demographic
 */
export const SCORING_WEIGHTS = {
    /** Weight for sales velocity (0-100 score) */
    sales_velocity: 0.30,
    /** Weight for trend potential score (0-100 score) */
    trend_potential: 0.25,
    /** Weight for stock movement (0-100 score) */
    stock_movement: 0.20,
    /** Weight for new product boost (0-100 score) */
    new_product_boost: 0.15,
    /** Weight for audience fit (0-100 score) */
    audience_fit: 0.10
};
/**
 * Verify weights sum to 1.0
 */
export function validateWeights() {
    const sum = Object.values(SCORING_WEIGHTS).reduce((acc, w) => acc + w, 0);
    return Math.abs(sum - 1.0) < 0.001;
}
// Pre-calculate for performance
const _weightSum = Object.values(SCORING_WEIGHTS).reduce((acc, w) => acc + w, 0);
if (Math.abs(_weightSum - 1.0) >= 0.001) {
    throw new Error(`Scoring weights must sum to 1.0, got ${_weightSum}`);
}
/**
 * Recommendation threshold
 * @description Minimum hype_score to recommend product for advertising.
 */
export const RECOMMENDATION_THRESHOLD = 65;
/**
 * Sales velocity thresholds (points out of 100)
 * @description Based on recent_sales_count
 */
export const SALES_VELOCITY_THRESHOLDS = {
    high: 75, // >= 100 sales
    medium: 50, // 50-99 sales
    low: 25, // 1-49 sales
    none: 0 // 0 sales
};
/**
 * Stock movement thresholds (points out of 100)
 * @description Based on sell_through_rate or inventory_days_on_hand
 */
export const STOCK_MOVEMENT_THRESHOLDS = {
    fast: 80, // sell_through_rate > 70% or days_on_hand < 7
    normal: 50, // sell_through_rate 30-70% or days_on_hand 7-30
    slow: 25, // sell_through_rate < 30% or days_on_hand > 30
    none: 0 // no stock data
};
/**
 * New product boost configuration
 * @description Boost applied when product is marked as new
 */
export const NEW_PRODUCT_BOOST_CONFIG = {
    /** Minimum stock threshold for boost */
    min_stock: 50,
    /** Boost amount when conditions met */
    boost_amount: 75,
    /** Boost amount when conditions not met */
    default_amount: 0
};
/**
 * Trend potential default when LLM unavailable
 */
export const TREND_POTENTIAL_DEFAULTS = {
    no_signals: 15,
    weak_signals: 25,
    moderate_signals: 40
};
/**
 * Audience fit default when no segment data
 */
export const AUDIENCE_FIT_DEFAULT = 0;
//# sourceMappingURL=weights.js.map