/**
 * MCP Scoring Engine - Rule-Based Score Extractors
 * @module mcp/scoring/rules
 * @file MCP-002: Pure rule-based scoring functions
 * @description Deterministic score extractors for core metrics.
 *            Same input always produces same output (no side effects).
 */

import type { ProductMetrics } from "../types/index.js";
import {
  SALES_VELOCITY_THRESHOLDS,
  STOCK_MOVEMENT_THRESHOLDS,
  NEW_PRODUCT_BOOST_CONFIG,
  AUDIENCE_FIT_DEFAULT
} from "./weights.js";

/**
 * Extract sales velocity score from product metrics
 * @param metrics - Product metrics
 * @returns Sales velocity score (0-100)
 */
export function extractSalesVelocity(metrics: ProductMetrics): number {
  const salesCount = metrics.recent_sales_count ?? metrics.sales_per_day ?? null;

  if (salesCount === null) {
    return SALES_VELOCITY_THRESHOLDS.none;
  }

  if (salesCount >= 100) {
    return SALES_VELOCITY_THRESHOLDS.high;
  }

  if (salesCount >= 50) {
    return SALES_VELOCITY_THRESHOLDS.medium;
  }

  if (salesCount >= 1) {
    return SALES_VELOCITY_THRESHOLDS.low;
  }

  return SALES_VELOCITY_THRESHOLDS.none;
}

/**
 * Extract stock movement score from product metrics
 * @param metrics - Product metrics
 * @returns Stock movement score (0-100)
 */
export function extractStockMovement(metrics: ProductMetrics): number {
  // Try sell_through_rate first
  if (metrics.sell_through_rate !== null) {
    if (metrics.sell_through_rate > 70) {
      return STOCK_MOVEMENT_THRESHOLDS.fast;
    }
    if (metrics.sell_through_rate >= 30) {
      return STOCK_MOVEMENT_THRESHOLDS.normal;
    }
    return STOCK_MOVEMENT_THRESHOLDS.slow;
  }

  // Try inventory_days_on_hand
  if (metrics.inventory_days_on_hand !== null) {
    if (metrics.inventory_days_on_hand < 7) {
      return STOCK_MOVEMENT_THRESHOLDS.fast;
    }
    if (metrics.inventory_days_on_hand <= 30) {
      return STOCK_MOVEMENT_THRESHOLDS.normal;
    }
    return STOCK_MOVEMENT_THRESHOLDS.slow;
  }

  // No stock data available
  return STOCK_MOVEMENT_THRESHOLDS.none;
}

/**
 * Extract new product boost score from product metrics
 * @param metrics - Product metrics
 * @returns New product boost score (0-75)
 */
export function extractNewProductBoost(metrics: ProductMetrics): number {
  if (!metrics.is_new) {
    return NEW_PRODUCT_BOOST_CONFIG.default_amount;
  }

  // Check stock threshold
  const currentStock = metrics.current_stock ?? 0;

  if (currentStock >= NEW_PRODUCT_BOOST_CONFIG.min_stock) {
    return NEW_PRODUCT_BOOST_CONFIG.boost_amount;
  }

  // New product but low stock
  return NEW_PRODUCT_BOOST_CONFIG.default_amount;
}

/**
 * Extract audience fit score from product metrics
 * @param metrics - Product metrics
 * @returns Audience fit score (0-100), 0 if no data
 */
export function extractAudienceFit(metrics: ProductMetrics): number {
  // Audience fit requires segment data
  if (
    metrics.audience_segment === null &&
    metrics.primary_age_range === null &&
    metrics.buying_motivation === null
  ) {
    return AUDIENCE_FIT_DEFAULT;
  }

  // For rule-based, we don't have enough context to score audience fit
  // In a real implementation, this would use LLM for contextual analysis
  // For now, return a baseline if any audience data exists
  return 50;
}

/**
 * Determine fallback note reason for missing sales data
 * @param metrics - Product metrics
 * @returns Fallback note or null
 */
export function salesVelocityFallbackNote(metrics: ProductMetrics): string | null {
  const salesCount = metrics.recent_sales_count ?? metrics.sales_per_day ?? null;

  if (salesCount === null) {
    return "sales_velocity_missing";
  }

  if (salesCount === 0) {
    return "sales_velocity_zero";
  }

  return null;
}

/**
 * Determine fallback note reason for missing stock data
 * @param metrics - Product metrics
 * @returns Fallback note or null
 */
export function stockMovementFallbackNote(metrics: ProductMetrics): string | null {
  const hasSellThrough = metrics.sell_through_rate !== null;
  const hasDaysOnHand = metrics.inventory_days_on_hand !== null;
  const hasStock = metrics.current_stock !== null;

  if (!hasSellThrough && !hasDaysOnHand && !hasStock) {
    return "stock_data_missing";
  }

  return null;
}

/**
 * Calculate hype_score from component scores
 * @param salesVelocity - Sales velocity score (0-100)
 * @param trendPotential - Trend potential score (0-100)
 * @param stockMovement - Stock movement score (0-100)
 * @param newProductBoost - New product boost score (0-100)
 * @param audienceFit - Audience fit score (0-100)
 * @returns Hype score (0-100), clamped
 */
export function calculateHypeScore(
  salesVelocity: number,
  trendPotential: number,
  stockMovement: number,
  newProductBoost: number,
  audienceFit: number
): number {
  const { sales_velocity, trend_potential, stock_movement, new_product_boost, audience_fit } = {
    sales_velocity: salesVelocity,
    trend_potential: trendPotential,
    stock_movement: stockMovement,
    new_product_boost: newProductBoost,
    audience_fit: audienceFit
  };

  const rawScore =
    sales_velocity * 0.30 +
    trend_potential * 0.25 +
    stock_movement * 0.20 +
    new_product_boost * 0.15 +
    audience_fit * 0.10;

  // Clamp to [0, 100]
  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

/**
 * Determine if product should be recommended
 * @param hypeScore - Calculated hype score
 * @param threshold - Recommendation threshold (default 65)
 * @returns true if product is recommended
 */
export function shouldRecommend(hypeScore: number, threshold = 65): boolean {
  return hypeScore >= threshold;
}

/**
 * Generate tie-breaker result for equal scores
 * @param productA - First product ID
 * @param productB - Second product ID
 * @returns -1, 0, or 1 for sorting
 */
export function tieBreaker(productA: string, productB: string): number {
  // Use string comparison as deterministic tie-breaker
  if (productA < productB) return -1;
  if (productA > productB) return 1;
  return 0;
}

/**
 * Validate score bounds
 * @param score - Score value to validate
 * @returns true if valid (0-100)
 */
export function isValidScore(score: number): boolean {
  return typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 100;
}

/**
 * Extract all scores from metrics (rule-based only)
 * @param metrics - Product metrics
 * @returns Object with all component scores
 */
export function extractAllScores(metrics: ProductMetrics): {
  sales_velocity: number;
  stock_movement: number;
  new_product_boost: number;
  audience_fit: number;
  trend_potential: number;
  hype_score: number;
} {
  const salesVelocity = extractSalesVelocity(metrics);
  const stockMovement = extractStockMovement(metrics);
  const newProductBoost = extractNewProductBoost(metrics);
  const audienceFit = extractAudienceFit(metrics);

  // Trend potential requires LLM - default to 0 for pure rule-based
  const trendPotential = 0;

  const hypeScore = calculateHypeScore(
    salesVelocity,
    trendPotential,
    stockMovement,
    newProductBoost,
    audienceFit
  );

  return {
    sales_velocity: salesVelocity,
    stock_movement: stockMovement,
    new_product_boost: newProductBoost,
    audience_fit: audienceFit,
    trend_potential: trendPotential,
    hype_score: hypeScore
  };
}
