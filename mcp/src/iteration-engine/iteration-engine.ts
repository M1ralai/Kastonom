/**
 * MCP Iteration Engine - Metric-Informed Creative Iteration
 * @module mcp/iteration-engine
 * @file MCP-005: Creative iteration suggestions based on ad metrics
 * @description Generate creative iteration suggestions from ad performance metrics.
 */

import type { AdMetrics, CreativeIterationSuggestion, Confidence } from "../types/index.js";
import { AD_METRIC_THRESHOLDS } from "../types/index.js";

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
export function analyzeMetricsAndSuggest(
  metrics: AdMetrics,
  projectId: string,
  adPublicationId: string,
  options: IterationEngineOptions = {}
): IterationSuggestionResult {
  const { llmApiKey } = options;
  const llmAvailable = llmApiKey !== null && llmApiKey !== undefined;

  // Analyze metrics to determine primary issue
  const issues: string[] = [];
  const suggestedChanges: {
    opening: string | null;
    hook: string | null;
    cta: string | null;
    angle: string | null;
    pacing: string | null;
  } = {
    opening: null,
    hook: null,
    cta: null,
    angle: null,
    pacing: null
  };

  // Check CTR
  if (metrics.ctr !== null && metrics.ctr < AD_METRIC_THRESHOLDS.CTR_LOW) {
    issues.push("ctr_below_threshold");
    suggestedChanges.hook = "Daha dikkat çekici hook kullan";
    suggestedChanges.cta = "Daha net CTA kullan";
  }

  // Check video view rate
  if (metrics.video_view_rate !== null && metrics.video_view_rate < AD_METRIC_THRESHOLDS.VIDEO_VIEW_RATE_LOW) {
    issues.push("video_view_rate_below_threshold");
    suggestedChanges.opening = "İlk 3 saniyeyi güçlendir";
    suggestedChanges.pacing = "Daha dinamik kurgu kullan";
  }

  // Check cost per video view
  if (metrics.cost_per_video_view !== null && metrics.cost_per_video_view > AD_METRIC_THRESHOLDS.COST_PER_VIDEO_VIEW_HIGH) {
    issues.push("cost_per_video_view_above_threshold");
    suggestedChanges.hook = "Erken dikkat çekici içerik";
    suggestedChanges.pacing = "Ana mesajı erken ver";
  }

  // Check ROAS
  if (metrics.roas !== null && metrics.roas < AD_METRIC_THRESHOLDS.ROAS_LOW) {
    issues.push("roas_below_threshold");
    suggestedChanges.cta = "Daha ikna edici CTA";
    suggestedChanges.angle = "Değer vurgusu ekle";
  }

  // High impressions but low CTR
  if (metrics.impressions !== null && metrics.ctr !== null) {
    if (metrics.impressions > 1000 && metrics.ctr < AD_METRIC_THRESHOLDS.CTR_VERY_LOW) {
      issues.push("high_impressions_low_ctr");
      suggestedChanges.hook = "Hedef kitleye özel hook";
      suggestedChanges.opening = "Görsel değişikliği";
    }
  }

  // Determine reason
  let reason: string;
  if (issues.includes("ctr_below_threshold")) {
    reason = "CTR düşüşü tespit edildi - hook ve CTA iyileştirmesi öneriliyor";
  } else if (issues.includes("video_view_rate_below_threshold")) {
    reason = "Video izleme oranı düşük - açılış ve pacing iyileştirmesi öneriliyor";
  } else if (issues.includes("cost_per_video_view_above_threshold")) {
    reason = "Video başı maliyet yüksek - erken dikkat çekme öneriliyor";
  } else if (issues.includes("roas_below_threshold")) {
    reason = "ROAS beklenenin altında - CTA ve angle iyileştirmesi öneriliyor";
  } else if (issues.includes("high_impressions_low_ctr")) {
    reason = "Çok gösterim az tıklama - hedef kitleye özel hook öneriliyor";
  } else {
    reason = "Genel iyileştirme önerisi";
  }

  // Determine confidence
  let confidence: Confidence;
  const hasSufficientMetrics = metrics.impressions !== null || metrics.ctr !== null || metrics.roas !== null;

  if (!hasSufficientMetrics) {
    confidence = "low";
  } else if (issues.length >= 2) {
    confidence = "high";
  } else if (issues.length === 1) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  // Build fallback notes
  const fallbackNotes: string[] = [];
  if (!llmAvailable) {
    fallbackNotes.push("llm_not_configured");
  }
  if (metrics.impressions === null) {
    fallbackNotes.push("impressions_missing");
  }
  if (metrics.ctr === null) {
    fallbackNotes.push("ctr_missing");
  }

  return {
    suggestion: {
      project_id: projectId,
      ad_publication_id: adPublicationId,
      metrics_snapshot_id: metrics.id || null,
      base_generation_request_id: null,
      new_generation_request_id: null,
      status: "suggested",
      reason,
      metric_drivers: issues,
      suggested_changes: suggestedChanges,
      confidence,
      fallback_notes: fallbackNotes
    },
    fallback_notes: fallbackNotes
  };
}

/**
 * Get alternative creative angles based on metrics
 * @param metrics - Ad metrics
 * @returns Array of alternative angles
 */
export function getAlternativeAngles(metrics: AdMetrics): string[] {
  const angles: string[] = [];

  if (metrics.ctr !== null && metrics.ctr < 0.02) {
    angles.push("emotion");
  }

  if (metrics.roas !== null && metrics.roas < 2.0) {
    angles.push("value");
  }

  if (metrics.video_view_rate !== null && metrics.video_view_rate > 0.5) {
    angles.push("story");
  }

  // Always include generic fallback
  if (angles.length === 0) {
    angles.push("general");
  }

  return angles;
}
