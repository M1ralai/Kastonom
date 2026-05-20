/**
 * MCP Iteration Engine - Metric-Informed Creative Iteration
 * @module mcp/iteration-engine
 * @file MCP-005: Creative iteration suggestions based on ad metrics
 * @description Generate creative iteration suggestions from ad performance metrics.
 */
import type { AdMetrics, CreativeIterationSuggestion } from "../types/index.js";
/**
 * Iteration engine options
 */
export interface IterationEngineOptions {
    llmApiKey?: string | null;
}
/**
 * Suggestion result from metric analysis
 */
export interface IterationSuggestionResult {
    suggestion: Omit<CreativeIterationSuggestion, "id" | "created_at" | "updated_at" | "tenant_id">;
    fallback_notes: string[];
}
/**
 * Analyze ad metrics and generate iteration suggestion
 * @param metrics - Ad metrics snapshot
 * @param projectId - Project ID
 * @param adPublicationId - Ad publication ID
 * @param options - Engine options
 * @returns Iteration suggestion result
 */
export declare function analyzeMetricsAndSuggest(metrics: AdMetrics, projectId: string, adPublicationId: string, options?: IterationEngineOptions): IterationSuggestionResult;
/**
 * Get alternative creative angles based on metrics
 * @param metrics - Ad metrics
 * @returns Array of alternative angles
 */
export declare function getAlternativeAngles(metrics: AdMetrics): string[];
//# sourceMappingURL=iteration-engine.d.ts.map