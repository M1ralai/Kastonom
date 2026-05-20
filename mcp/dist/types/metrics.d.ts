/**
 * MCP Core Types - Product Metrics Interface
 * @module mcp/types/metrics
 * @file MCP-001: ProductMetrics and Scoring Interfaces
 * @description Interfaces for product scoring metrics and data.
 */
import { MetricSource } from "./enums.js";
/**
 * Product metrics from commerce/ERP data
 * @description Contains product performance and inventory signals for scoring.
 *            All values are nullable - missing data should not be invented.
 */
export interface ProductMetrics {
    /** Product ID this metrics belong to */
    product_id: string;
    /** Tenant ID for scoping */
    tenant_id: string;
    /** Recent sales count for velocity calculation */
    recent_sales_count: number | null;
    /** Average daily sales over measurement period */
    sales_per_day: number | null;
    /** Current inventory level */
    current_stock: number | null;
    /** Days inventory on hand (sell-through indicator) */
    inventory_days_on_hand: number | null;
    /** Sell-through rate as percentage (0-100) */
    sell_through_rate: number | null;
    /** Whether this is a newly launched product */
    is_new: boolean;
    /** Product category for trend analysis */
    category: string | null;
    /** Product subcategory for segment analysis */
    subcategory: string | null;
    /** Available trend signals (market keywords, signals) */
    trend_signals: string[];
    /** Audience segment data (if available) */
    audience_segment: string | null;
    /** Primary demographic target */
    primary_age_range: string | null;
    /** Primary buying motivation */
    buying_motivation: string | null;
    /** Campaign objective preference (if set) */
    campaign_preference: "awareness" | "traffic" | "conversions" | "engagement" | "app_promotion" | "lead_generation" | null;
    /** Platform preference (if set) */
    platform_preference: "meta_ads" | "google_ads" | "tiktok" | "reels" | "youtube_shorts" | "generic_vertical" | null;
    /** Language preference for content */
    language_preference: string | null;
    /** Source of these metrics */
    source: MetricSource;
    /** Date metrics were captured */
    captured_at: string;
}
/**
 * Create default ProductMetrics with all nulls
 * @param productId - Product ID
 * @param tenantId - Tenant ID
 * @returns Default metrics object
 */
export declare function createDefaultProductMetrics(productId: string, tenantId: string): ProductMetrics;
/**
 * Check if metrics has sufficient data for scoring
 * @param metrics - ProductMetrics
 * @returns true if at least some sales or stock data exists
 */
export declare function hasScoringData(metrics: ProductMetrics): boolean;
/**
 * Check if metrics has audience data
 * @param metrics - ProductMetrics
 * @returns true if audience segment data exists
 */
export declare function hasAudienceData(metrics: ProductMetrics): boolean;
/**
 * Ad metrics from published ad
 * @description Contains performance metrics for creative iteration.
 */
export interface AdMetrics {
    /** Metrics ID */
    id: string;
    /** Ad publication ID these metrics belong to */
    ad_publication_id: string;
    /** Tenant ID for scoping */
    tenant_id: string;
    /** Platform these metrics came from */
    platform: "meta_ads" | "google_ads";
    /** Date range for metrics */
    date_start: string;
    /** Date range end */
    date_end: string;
    /** Number of impressions */
    impressions: number | null;
    /** Number of clicks */
    clicks: number | null;
    /** Click-through rate (0-1) */
    ctr: number | null;
    /** Cost per click */
    cpc: number | null;
    /** Total spend */
    spend: number | null;
    /** Currency for spend */
    currency: string | null;
    /** Number of conversions */
    conversions: number | null;
    /** Value of conversions */
    conversion_value: number | null;
    /** Return on ad spend */
    roas: number | null;
    /** Number of video views */
    video_views: number | null;
    /** Video view rate (0-1) */
    video_view_rate: number | null;
    /** Cost per video view */
    cost_per_video_view: number | null;
    /** Source of metrics */
    source: MetricSource;
    /** Date metrics were fetched */
    fetched_at: string;
}
/**
 * Create default AdMetrics
 */
export declare function createDefaultAdMetrics(adPublicationId: string, tenantId: string, platform: "meta_ads" | "google_ads"): AdMetrics;
/**
 * Threshold values for ad metric analysis (from MCP-005)
 */
export declare const AD_METRIC_THRESHOLDS: {
    readonly CTR_LOW: 0.02;
    readonly CTR_VERY_LOW: 0.01;
    readonly VIDEO_VIEW_RATE_LOW: 0.3;
    readonly COST_PER_VIDEO_VIEW_HIGH: 0.5;
    readonly ROAS_LOW: 1.5;
    readonly ROAS_VERY_LOW: 1;
};
/**
 * Check if CTR is below threshold
 * @param ctr - Click-through rate (0-1)
 * @returns true if CTR is low
 */
export declare function isCtrLow(ctr: number | null): boolean;
/**
 * Check if video view rate is low
 * @param vvr - Video view rate (0-1)
 * @returns true if video view rate is low
 */
export declare function isVideoViewRateLow(vvr: number | null): boolean;
/**
 * Check if cost per video view is high
 * @param cpvv - Cost per video view
 * @returns true if cost is high
 */
export declare function isCostPerVideoViewHigh(cpvv: number | null): boolean;
/**
 * Check if ROAS is low
 * @param roas - Return on ad spend
 * @returns true if ROAS is below threshold
 */
export declare function isRoasLow(roas: number | null): boolean;
/**
 * Validate ProductMetrics structure
 * @param metrics - Metrics to validate
 * @returns true if valid
 */
export declare function isValidProductMetrics(metrics: unknown): metrics is ProductMetrics;
/**
 * Validate AdMetrics structure
 * @param metrics - Metrics to validate
 * @returns true if valid
 */
export declare function isValidAdMetrics(metrics: unknown): metrics is AdMetrics;
//# sourceMappingURL=metrics.d.ts.map