/**
 * MCP Core Types - AI Behavior Output and Related Interfaces
 * @module mcp/types/ai-behavior
 * @file MCP-001: AIBehaviorOutput and related interfaces
 * @description Strict TypeScript interfaces for MCP AI intelligence layer outputs.
 *            All outputs must be JSON-compatible and follow AI behavior contract.
 */
import { isValidConfidence, isValidGenerationMethod } from "./enums.js";
/**
 * Default scores when no data available
 * @description All scores default to 0 when metrics are missing.
 */
export function createDefaultScores() {
    return {
        hype_score: 0,
        trend_potential_score: 0,
        sales_velocity: 0,
        stock_movement: 0,
        new_product_boost: 0,
        audience_fit: 0
    };
}
/**
 * Default audience summary when no data available
 */
export function createDefaultAudienceSummary() {
    return {
        primary_segment: null,
        age_range: null,
        buying_motivation: null,
        source: "unknown"
    };
}
/**
 * Create metadata for rule-based generation
 */
export function createRuleBasedMetadata() {
    return {
        llm_used: false,
        llm_available: false,
        generation_method: "rule_based",
        model_used: null,
        confidence: "medium"
    };
}
/**
 * Create metadata for LLM-based generation
 */
export function createLLMMetadata(model, method, confidence) {
    return {
        llm_used: true,
        llm_available: true,
        generation_method: method,
        model_used: model,
        confidence
    };
}
/**
 * Create a basic AIBehaviorOutput with required fields
 * @param productId - Product ID
 * @param metadata - Output metadata
 * @returns AIBehaviorOutput with default values
 */
export function createBasicAIBehaviorOutput(productId, metadata) {
    return {
        product_id: productId,
        recommendation: {
            selected: false,
            reason: "Insufficient data for recommendation"
        },
        scores: createDefaultScores(),
        audience_summary: createDefaultAudienceSummary(),
        creative_brief: {
            hook: "Ürünü keşfedin",
            main_claim: "Kaliteli ürün, uygun fiyat",
            call_to_action: "Detayları gör",
            creative_angle: "value",
            tone: "professional"
        },
        fallback_notes: [],
        metadata
    };
}
/**
 * Validate scores are bounded 0-100
 * @param scores - Scores to validate
 * @returns true if all scores are valid
 */
export function areScoresValid(scores) {
    const scoreValues = [
        scores.hype_score,
        scores.trend_potential_score,
        scores.sales_velocity,
        scores.stock_movement,
        scores.new_product_boost,
        scores.audience_fit
    ];
    return scoreValues.every((score) => typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 100);
}
/**
 * Validate AIBehaviorOutput structure
 * @param output - Output to validate
 * @returns true if valid
 */
export function isAIBehaviorOutput(output) {
    if (!output || typeof output !== "object") {
        return false;
    }
    const out = output;
    // Required fields check
    if (typeof out.product_id !== "string")
        return false;
    if (!out.recommendation || typeof out.recommendation !== "object")
        return false;
    if (!out.scores || typeof out.scores !== "object")
        return false;
    if (!out.audience_summary || typeof out.audience_summary !== "object")
        return false;
    if (!out.creative_brief || typeof out.creative_brief !== "object")
        return false;
    if (!Array.isArray(out.fallback_notes))
        return false;
    if (!out.metadata || typeof out.metadata !== "object")
        return false;
    // Metadata validation
    const meta = out.metadata;
    if (typeof meta.llm_used !== "boolean")
        return false;
    if (typeof meta.llm_available !== "boolean")
        return false;
    if (!isValidGenerationMethod(meta.generation_method))
        return false;
    if (!isValidConfidence(meta.confidence))
        return false;
    // Scores validation
    if (!areScoresValid(out.scores))
        return false;
    return true;
}
/**
 * Clone AIBehaviorOutput safely
 * @param output - Output to clone
 * @returns Deep copy of output
 */
export function cloneAIBehaviorOutput(output) {
    return JSON.parse(JSON.stringify(output));
}
//# sourceMappingURL=ai-behavior.js.map