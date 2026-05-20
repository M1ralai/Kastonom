/**
 * MCP Scoring Engine - Main Scoring Engine
 * @module mcp/scoring/scoring-engine
 * @file MCP-002: Scoring engine with LLM enhancement and fallback
 * @description Main scoring engine combining rule-based and LLM-enhanced scoring.
 */

import type {
  TenantContext,
  ProductMetrics,
  AIBehaviorOutput,
  Scores,
  OutputMetadata,
  FallbackNote
} from "../types/index.js";
import { createRuleBasedMetadata, createLLMMetadata, createDefaultAudienceSummary } from "../types/index.js";
import {
  extractSalesVelocity,
  extractStockMovement,
  extractNewProductBoost,
  extractAudienceFit,
  calculateHypeScore,
  shouldRecommend,
  salesVelocityFallbackNote,
  stockMovementFallbackNote
} from "./rules.js";
import { RECOMMENDATION_THRESHOLD, TREND_POTENTIAL_DEFAULTS } from "./weights.js";

// LLM client configuration
export interface LLMConfig {
  apiKey: string | null;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  retryAttempts: number;
}

const DEFAULT_LLM_CONFIG: LLMConfig = {
  apiKey: null,
  model: "gpt-4",
  temperature: 0.3,
  maxTokens: 400,
  timeoutMs: 20000,
  retryAttempts: 2
};

/**
 * Scoring engine options
 */
export interface ScoringEngineOptions {
  llmConfig?: LLMConfig;
  recommendationThreshold?: number;
}

/**
 * Scoring engine
 */
export class ScoringEngine {
  private llmConfig: LLMConfig;
  private recommendationThreshold: number;

  constructor(options: ScoringEngineOptions = {}) {
    this.llmConfig = { ...DEFAULT_LLM_CONFIG, ...options.llmConfig };
    this.recommendationThreshold = options.recommendationThreshold ?? RECOMMENDATION_THRESHOLD;
  }

  /**
   * Check if LLM is available
   */
  isLLMAvailable(): boolean {
    return this.llmConfig.apiKey !== null && this.llmConfig.apiKey.length > 0;
  }

  /**
   * Calculate all scores for a product (sync rule-based)
   * @param metrics - Product metrics
   * @returns All scoring components
   */
  calculateAllScores(metrics: ProductMetrics): Scores {
    // Rule-based extractors
    const salesVelocity = extractSalesVelocity(metrics);
    const stockMovement = extractStockMovement(metrics);
    const newProductBoost = extractNewProductBoost(metrics);
    const audienceFit = extractAudienceFit(metrics);

    // For trend potential, use rule-based default (LLM enhancement handled separately)
    const trendPotential = this.getRuleBasedTrendPotential(metrics);

    // Calculate final hype score
    const hypeScore = calculateHypeScore(
      salesVelocity,
      trendPotential,
      stockMovement,
      newProductBoost,
      audienceFit
    );

    return {
      hype_score: hypeScore,
      trend_potential_score: trendPotential,
      sales_velocity: salesVelocity,
      stock_movement: stockMovement,
      new_product_boost: newProductBoost,
      audience_fit: audienceFit
    };
  }

  /**
   * Calculate scores with LLM enhancement (async)
   * @param metrics - Product metrics
   * @returns All scoring components
   */
  async calculateAllScoresWithLLM(metrics: ProductMetrics): Promise<Scores> {
    // Rule-based extractors
    const salesVelocity = extractSalesVelocity(metrics);
    const stockMovement = extractStockMovement(metrics);
    const newProductBoost = extractNewProductBoost(metrics);
    const audienceFit = extractAudienceFit(metrics);

    // For trend potential, use LLM if available
    let trendPotential: number;
    if (this.isLLMAvailable()) {
      trendPotential = await this.analyzeTrendWithLLM(metrics);
    } else {
      trendPotential = this.getRuleBasedTrendPotential(metrics);
    }

    // Calculate final hype score
    const hypeScore = calculateHypeScore(
      salesVelocity,
      trendPotential,
      stockMovement,
      newProductBoost,
      audienceFit
    );

    return {
      hype_score: hypeScore,
      trend_potential_score: trendPotential,
      sales_velocity: salesVelocity,
      stock_movement: stockMovement,
      new_product_boost: newProductBoost,
      audience_fit: audienceFit
    };
  }

  /**
   * Get rule-based trend potential (fallback when LLM unavailable)
   */
  private getRuleBasedTrendPotential(metrics: ProductMetrics): number {
    const trendSignals = metrics.trend_signals ?? [];

    if (trendSignals.length === 0) {
      return TREND_POTENTIAL_DEFAULTS.no_signals;
    }

    if (trendSignals.length <= 2) {
      return TREND_POTENTIAL_DEFAULTS.weak_signals;
    }

    // Multiple signals indicate moderate trend potential
    return TREND_POTENTIAL_DEFAULTS.moderate_signals;
  }

  /**
   * Analyze trend with LLM
   */
  private async analyzeTrendWithLLM(metrics: ProductMetrics): Promise<number> {
    // This would call the LLM client in actual implementation
    // For now, return a value based on trend signals
    const trendSignals = metrics.trend_signals ?? [];

    if (trendSignals.length === 0) {
      return TREND_POTENTIAL_DEFAULTS.no_signals;
    }

    // Simulate LLM analysis based on signals
    const baseScore = TREND_POTENTIAL_DEFAULTS.weak_signals;
    const signalBonus = Math.min(trendSignals.length * 5, 25);

    return Math.min(100, baseScore + signalBonus);
  }

  /**
   * Generate recommendation reason
   * @param scores - Calculated scores
   * @param metrics - Product metrics
   * @returns Recommendation reason string
   */
  generateRecommendationReason(scores: Scores, metrics: ProductMetrics): string {
    // Rule-based reason generation
    const parts: string[] = [];

    if (scores.sales_velocity >= 75) {
      parts.push("yüksek satış hızı");
    } else if (scores.sales_velocity >= 50) {
      parts.push("orta seviye satış performansı");
    }

    if (scores.stock_movement >= 80) {
      parts.push("hızlı stok hareketi");
    }

    if (scores.new_product_boost > 0) {
      parts.push("yeni ürün bonusu");
    }

    if (scores.trend_potential_score >= 50) {
      parts.push("trend potansiyeli yüksek");
    }

    if (parts.length === 0) {
      return "Metrikler öneri sinyali veriyor";
    }

    return parts.join(", ") + " ile öne çıkan ürün";
  }

  /**
   * Determine fallback notes for missing data
   */
  determineFallbackNotes(metrics: ProductMetrics): FallbackNote[] {
    const notes: FallbackNote[] = [];

    const salesNote = salesVelocityFallbackNote(metrics);
    if (salesNote) {
      notes.push({
        field_name: "sales_velocity",
        reason: salesNote,
        default_value_used: "0"
      });
    }

    const stockNote = stockMovementFallbackNote(metrics);
    if (stockNote) {
      notes.push({
        field_name: "stock_movement",
        reason: stockNote,
        default_value_used: "0"
      });
    }

    if (!this.isLLMAvailable()) {
      notes.push({
        field_name: "trend_potential_score",
        reason: "llm_not_configured",
        default_value_used: "rule_based_fallback"
      });
    }

    if (!metrics.audience_segment && !metrics.primary_age_range && !metrics.buying_motivation) {
      notes.push({
        field_name: "audience_fit",
        reason: "audience_data_missing",
        default_value_used: "50"
      });
    }

    return notes;
  }

  /**
   * Generate full AIBehaviorOutput (sync, rule-based fallback)
   * @param tenantContext - Tenant context (unused for now, reserved for future use)
   * @param metrics - Product metrics
   * @returns Complete AIBehaviorOutput
   */
  generateScoringOutput(
    _tenantContext: TenantContext,
    metrics: ProductMetrics
  ): AIBehaviorOutput {
    const scores = this.calculateAllScores(metrics);
    const recommended = shouldRecommend(scores.hype_score, this.recommendationThreshold);
    const reason = this.generateRecommendationReason(scores, metrics);
    const fallbackNotes = this.determineFallbackNotes(metrics);

    // Build audience summary
    const audienceSummary = createDefaultAudienceSummary();
    if (metrics.audience_segment) {
      audienceSummary.primary_segment = metrics.audience_segment;
      audienceSummary.source = "analytics";
    }
    if (metrics.primary_age_range) {
      audienceSummary.age_range = metrics.primary_age_range;
    }
    if (metrics.buying_motivation) {
      audienceSummary.buying_motivation = metrics.buying_motivation;
    }

    // Determine metadata
    let metadata: OutputMetadata;
    if (this.isLLMAvailable()) {
      metadata = createLLMMetadata(
        this.llmConfig.model,
        "hybrid",
        fallbackNotes.length > 2 ? "low" : fallbackNotes.length > 0 ? "medium" : "high"
      );
    } else {
      metadata = createRuleBasedMetadata();
    }

    return {
      product_id: metrics.product_id,
      recommendation: {
        selected: recommended,
        reason
      },
      scores,
      audience_summary: audienceSummary,
      creative_brief: {
        hook: "Ürünü keşfedin",
        main_claim: "Kaliteli ürün, uygun fiyat",
        call_to_action: "Detayları gör",
        creative_angle: "value",
        tone: "professional"
      },
      fallback_notes: fallbackNotes,
      metadata
    };
  }

  /**
   * Generate full AIBehaviorOutput with LLM enhancement (async)
   * @param tenantContext - Tenant context (unused for now, reserved for future use)
   * @param metrics - Product metrics
   * @returns Complete AIBehaviorOutput
   */
  async generateScoringOutputWithLLM(
    _tenantContext: TenantContext,
    metrics: ProductMetrics
  ): Promise<AIBehaviorOutput> {
    const scores = await this.calculateAllScoresWithLLM(metrics);
    const recommended = shouldRecommend(scores.hype_score, this.recommendationThreshold);
    const reason = this.generateRecommendationReason(scores, metrics);
    const fallbackNotes = this.determineFallbackNotes(metrics);

    // Build audience summary
    const audienceSummary = createDefaultAudienceSummary();
    if (metrics.audience_segment) {
      audienceSummary.primary_segment = metrics.audience_segment;
      audienceSummary.source = "analytics";
    }
    if (metrics.primary_age_range) {
      audienceSummary.age_range = metrics.primary_age_range;
    }
    if (metrics.buying_motivation) {
      audienceSummary.buying_motivation = metrics.buying_motivation;
    }

    // Determine metadata
    let metadata: OutputMetadata;
    if (this.isLLMAvailable()) {
      metadata = createLLMMetadata(
        this.llmConfig.model,
        "llm",
        fallbackNotes.length > 2 ? "low" : fallbackNotes.length > 0 ? "medium" : "high"
      );
    } else {
      metadata = createRuleBasedMetadata();
    }

    return {
      product_id: metrics.product_id,
      recommendation: {
        selected: recommended,
        reason
      },
      scores,
      audience_summary: audienceSummary,
      creative_brief: {
        hook: "Ürünü keşfedin",
        main_claim: "Kaliteli ürün, uygun fiyat",
        call_to_action: "Detayları gör",
        creative_angle: "value",
        tone: "professional"
      },
      fallback_notes: fallbackNotes,
      metadata
    };
  }
}

/**
 * Create default scoring engine
 */
export function createScoringEngine(options?: ScoringEngineOptions): ScoringEngine {
  return new ScoringEngine(options);
}

/**
 * Quick scoring function for simple use cases (sync, rule-based)
 */
export function quickScore(
  _tenantContext: TenantContext,
  metrics: ProductMetrics,
  options?: ScoringEngineOptions
): AIBehaviorOutput {
  const engine = createScoringEngine(options);
  return engine.generateScoringOutput(_tenantContext, metrics);
}
