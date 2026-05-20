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
export declare const SCORING_WEIGHTS: {
    /** Weight for sales velocity (0-100 score) */
    readonly sales_velocity: 0.3;
    /** Weight for trend potential score (0-100 score) */
    readonly trend_potential: 0.25;
    /** Weight for stock movement (0-100 score) */
    readonly stock_movement: 0.2;
    /** Weight for new product boost (0-100 score) */
    readonly new_product_boost: 0.15;
    /** Weight for audience fit (0-100 score) */
    readonly audience_fit: 0.1;
};
/**
 * Verify weights sum to 1.0
 */
export declare function validateWeights(): boolean;
/**
 * Recommendation threshold
 * @description Minimum hype_score to recommend product for advertising.
 */
export declare const RECOMMENDATION_THRESHOLD = 65;
/**
 * Sales velocity thresholds (points out of 100)
 * @description Based on recent_sales_count
 */
export declare const SALES_VELOCITY_THRESHOLDS: {
    readonly high: 75;
    readonly medium: 50;
    readonly low: 25;
    readonly none: 0;
};
/**
 * Stock movement thresholds (points out of 100)
 * @description Based on sell_through_rate or inventory_days_on_hand
 */
export declare const STOCK_MOVEMENT_THRESHOLDS: {
    readonly fast: 80;
    readonly normal: 50;
    readonly slow: 25;
    readonly none: 0;
};
/**
 * New product boost configuration
 * @description Boost applied when product is marked as new
 */
export declare const NEW_PRODUCT_BOOST_CONFIG: {
    /** Minimum stock threshold for boost */
    readonly min_stock: 50;
    /** Boost amount when conditions met */
    readonly boost_amount: 75;
    /** Boost amount when conditions not met */
    readonly default_amount: 0;
};
/**
 * Trend potential default when LLM unavailable
 */
export declare const TREND_POTENTIAL_DEFAULTS: {
    readonly no_signals: 15;
    readonly weak_signals: 25;
    readonly moderate_signals: 40;
};
/**
 * Audience fit default when no segment data
 */
export declare const AUDIENCE_FIT_DEFAULT = 0;
/**
 * Type definitions for scoring inputs
 */
export interface ScoringWeights {
    sales_velocity: number;
    trend_potential: number;
    stock_movement: number;
    new_product_boost: number;
    audience_fit: number;
}
export type RecommendationThreshold = number;
//# sourceMappingURL=weights.d.ts.map