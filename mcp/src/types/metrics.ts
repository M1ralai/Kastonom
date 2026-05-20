/**
 * MCP Core Types - Product Metrics Interface
 * @module mcp/types/metrics
 * @file MCP-001: ProductMetrics and Scoring Interfaces
 * @description Interfaces for product scoring metrics and data.
 */

import { isValidMetricSource, MetricSource } from "./enums.js";

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
export function createDefaultProductMetrics(productId: string, tenantId: string): ProductMetrics {
  return {
    product_id: productId,
    tenant_id: tenantId,
    recent_sales_count: null,
    sales_per_day: null,
    current_stock: null,
    inventory_days_on_hand: null,
    sell_through_rate: null,
    is_new: false,
    category: null,
    subcategory: null,
    trend_signals: [],
    audience_segment: null,
    primary_age_range: null,
    buying_motivation: null,
    campaign_preference: null,
    platform_preference: null,
    language_preference: null,
    source: "unknown",
    captured_at: new Date().toISOString()
  };
}

/**
 * Check if metrics has sufficient data for scoring
 * @param metrics - ProductMetrics
 * @returns true if at least some sales or stock data exists
 */
export function hasScoringData(metrics: ProductMetrics): boolean {
  return (
    (metrics.recent_sales_count !== null && metrics.recent_sales_count > 0) ||
    (metrics.sales_per_day !== null && metrics.sales_per_day > 0) ||
    (metrics.current_stock !== null && metrics.current_stock > 0) ||
    (metrics.sell_through_rate !== null && metrics.sell_through_rate > 0)
  );
}

/**
 * Check if metrics has audience data
 * @param metrics - ProductMetrics
 * @returns true if audience segment data exists
 */
export function hasAudienceData(metrics: ProductMetrics): boolean {
  return (
    metrics.audience_segment !== null ||
    metrics.primary_age_range !== null ||
    metrics.buying_motivation !== null
  );
}

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
export function createDefaultAdMetrics(
  adPublicationId: string,
  tenantId: string,
  platform: "meta_ads" | "google_ads"
): AdMetrics {
  return {
    id: "",
    ad_publication_id: adPublicationId,
    tenant_id: tenantId,
    platform,
    date_start: "",
    date_end: "",
    impressions: null,
    clicks: null,
    ctr: null,
    cpc: null,
    spend: null,
    currency: null,
    conversions: null,
    conversion_value: null,
    roas: null,
    video_views: null,
    video_view_rate: null,
    cost_per_video_view: null,
    source: "unknown",
    fetched_at: new Date().toISOString()
  };
}

/**
 * Threshold values for ad metric analysis (from MCP-005)
 */
export const AD_METRIC_THRESHOLDS = {
  CTR_LOW: 0.02,
  CTR_VERY_LOW: 0.01,
  VIDEO_VIEW_RATE_LOW: 0.30,
  COST_PER_VIDEO_VIEW_HIGH: 0.50,
  ROAS_LOW: 1.5,
  ROAS_VERY_LOW: 1.0
} as const;

/**
 * Check if CTR is below threshold
 * @param ctr - Click-through rate (0-1)
 * @returns true if CTR is low
 */
export function isCtrLow(ctr: number | null): boolean {
  return ctr !== null && ctr < AD_METRIC_THRESHOLDS.CTR_LOW;
}

/**
 * Check if video view rate is low
 * @param vvr - Video view rate (0-1)
 * @returns true if video view rate is low
 */
export function isVideoViewRateLow(vvr: number | null): boolean {
  return vvr !== null && vvr < AD_METRIC_THRESHOLDS.VIDEO_VIEW_RATE_LOW;
}

/**
 * Check if cost per video view is high
 * @param cpvv - Cost per video view
 * @returns true if cost is high
 */
export function isCostPerVideoViewHigh(cpvv: number | null): boolean {
  return cpvv !== null && cpvv > AD_METRIC_THRESHOLDS.COST_PER_VIDEO_VIEW_HIGH;
}

/**
 * Check if ROAS is low
 * @param roas - Return on ad spend
 * @returns true if ROAS is below threshold
 */
export function isRoasLow(roas: number | null): boolean {
  return roas !== null && roas < AD_METRIC_THRESHOLDS.ROAS_LOW;
}

/**
 * Validate ProductMetrics structure
 * @param metrics - Metrics to validate
 * @returns true if valid
 */
export function isValidProductMetrics(metrics: unknown): metrics is ProductMetrics {
  if (!metrics || typeof metrics !== "object") {
    return false;
  }

  const m = metrics as Record<string, unknown>;

  return (
    typeof m.product_id === "string" &&
    typeof m.tenant_id === "string" &&
    Array.isArray(m.trend_signals) &&
    typeof m.is_new === "boolean" &&
    isValidMetricSource(m.source)
  );
}

/**
 * Validate AdMetrics structure
 * @param metrics - Metrics to validate
 * @returns true if valid
 */
export function isValidAdMetrics(metrics: unknown): metrics is AdMetrics {
  if (!metrics || typeof metrics !== "object") {
    return false;
  }

  const m = metrics as Record<string, unknown>;

  return (
    typeof m.id === "string" &&
    typeof m.ad_publication_id === "string" &&
    typeof m.tenant_id === "string" &&
    (m.platform === "meta_ads" || m.platform === "google_ads") &&
    typeof m.fetched_at === "string"
  );
}
