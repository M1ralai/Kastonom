/**
 * MCP Scoring Engine - Main Scoring Engine
 * @module mcp/scoring/scoring-engine
 * @file MCP-002: Scoring engine with LLM enhancement and fallback
 * @description Main scoring engine combining rule-based and LLM-enhanced scoring.
 */
import type { TenantContext, ProductMetrics, AIBehaviorOutput, Scores, FallbackNote } from "../types/index.js";
export interface LLMConfig {
    apiKey: string | null;
    model: string;
    temperature: number;
    maxTokens: number;
    timeoutMs: number;
    retryAttempts: number;
}
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
export declare class ScoringEngine {
    private llmConfig;
    private recommendationThreshold;
    constructor(options?: ScoringEngineOptions);
    /**
     * Check if LLM is available
     */
    isLLMAvailable(): boolean;
    /**
     * Calculate all scores for a product (sync rule-based)
     * @param metrics - Product metrics
     * @returns All scoring components
     */
    calculateAllScores(metrics: ProductMetrics): Scores;
    /**
     * Calculate scores with LLM enhancement (async)
     * @param metrics - Product metrics
     * @returns All scoring components
     */
    calculateAllScoresWithLLM(metrics: ProductMetrics): Promise<Scores>;
    /**
     * Get rule-based trend potential (fallback when LLM unavailable)
     */
    private getRuleBasedTrendPotential;
    /**
     * Analyze trend with LLM
     */
    private analyzeTrendWithLLM;
    /**
     * Generate recommendation reason
     * @param scores - Calculated scores
     * @param metrics - Product metrics
     * @returns Recommendation reason string
     */
    generateRecommendationReason(scores: Scores, metrics: ProductMetrics): string;
    /**
     * Determine fallback notes for missing data
     */
    determineFallbackNotes(metrics: ProductMetrics): FallbackNote[];
    /**
     * Generate full AIBehaviorOutput (sync, rule-based fallback)
     * @param tenantContext - Tenant context (unused for now, reserved for future use)
     * @param metrics - Product metrics
     * @returns Complete AIBehaviorOutput
     */
    generateScoringOutput(_tenantContext: TenantContext, metrics: ProductMetrics): AIBehaviorOutput;
    /**
     * Generate full AIBehaviorOutput with LLM enhancement (async)
     * @param tenantContext - Tenant context (unused for now, reserved for future use)
     * @param metrics - Product metrics
     * @returns Complete AIBehaviorOutput
     */
    generateScoringOutputWithLLM(_tenantContext: TenantContext, metrics: ProductMetrics): Promise<AIBehaviorOutput>;
}
/**
 * Create default scoring engine
 */
export declare function createScoringEngine(options?: ScoringEngineOptions): ScoringEngine;
/**
 * Quick scoring function for simple use cases (sync, rule-based)
 */
export declare function quickScore(_tenantContext: TenantContext, metrics: ProductMetrics, options?: ScoringEngineOptions): AIBehaviorOutput;
//# sourceMappingURL=scoring-engine.d.ts.map