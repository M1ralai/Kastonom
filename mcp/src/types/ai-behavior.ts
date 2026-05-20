/**
 * MCP Core Types - AI Behavior Output and Related Interfaces
 * @module mcp/types/ai-behavior
 * @file MCP-001: AIBehaviorOutput and related interfaces
 * @description Strict TypeScript interfaces for MCP AI intelligence layer outputs.
 *            All outputs must be JSON-compatible and follow AI behavior contract.
 */

import {
  Confidence,
  GenerationMethod,
  SubjectSource,
  SubjectType,
  isValidConfidence,
  isValidGenerationMethod,
  isValidSubjectSource,
  isValidSubjectType
} from "./enums.js";

/**
 * Product scoring fields
 * @description Core metrics used for product recommendation and scoring.
 */
export interface Scores {
  /** Combined score for advertising momentum (0-100) */
  hype_score: number;
  /** Estimated trend fit based on signals (0-100) */
  trend_potential_score: number;
  /** Recent sales movement (0-100) */
  sales_velocity: number;
  /** Stock sell-through or inventory signal (0-100) */
  stock_movement: number;
  /** Boost for new products (0-100) */
  new_product_boost: number;
  /** Fit between product and audience (0-100) */
  audience_fit: number;
}

/**
 * Default scores when no data available
 * @description All scores default to 0 when metrics are missing.
 */
export function createDefaultScores(): Scores {
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
 * Product recommendation result
 * @description Contains the recommendation decision and its rationale.
 */
export interface Recommendation {
  /** Whether this product is recommended for advertising */
  selected: boolean;
  /** Explanation of why product was selected or rejected */
  reason: string;
}

/**
 * Audience summary
 * @description Summarizes the likely audience from available data.
 */
export interface AudienceSummary {
  /** Primary target segment */
  primary_segment: string | null;
  /** Age range of target audience */
  age_range: string | null;
  /** Primary buying motivation */
  buying_motivation: string | null;
  /** Source of the audience data */
  source: "mock" | "erp" | "commerce" | "analytics" | "unknown";
}

/**
 * Default audience summary when no data available
 */
export function createDefaultAudienceSummary(): AudienceSummary {
  return {
    primary_segment: null,
    age_range: null,
    buying_motivation: null,
    source: "unknown"
  };
}

/**
 * Metadata about how the output was generated
 * @description Tracks LLM usage and generation method for transparency.
 */
export interface OutputMetadata {
  /** Whether LLM was used in generation */
  llm_used: boolean;
  /** Whether LLM is available/configured */
  llm_available: boolean;
  /** Method used: 'llm', 'rule_based', or 'hybrid' */
  generation_method: GenerationMethod;
  /** Model used for LLM calls (null if not using LLM) */
  model_used: string | null;
  /** Confidence level in the output */
  confidence: Confidence;
}

/**
 * Create metadata for rule-based generation
 */
export function createRuleBasedMetadata(): OutputMetadata {
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
export function createLLMMetadata(model: string, method: GenerationMethod, confidence: Confidence): OutputMetadata {
  return {
    llm_used: true,
    llm_available: true,
    generation_method: method,
    model_used: model,
    confidence
  };
}

/**
 * Fallback note for tracking data gaps
 * @description Documents missing data and why defaults were chosen.
 */
export interface FallbackNote {
  /** The field that has missing data */
  field_name: string;
  /** Why this field is unknown */
  reason: string;
  /** Default value used (null if no default) */
  default_value_used: string | null;
}

/**
 * Creative brief content
 * @description Generated creative content for the ad.
 */
export interface CreativeBriefContent {
  /** First 3-second attention grabber (max 15 words) */
  hook: string;
  /** Main message/claim (max 20 words) */
  main_claim: string;
  /** Call to action (max 8 words) */
  call_to_action: string;
  /** Creative angle (trending, premium, value, emotion, story) */
  creative_angle: string;
  /** Tone (modern, playful, professional, luxury, casual) */
  tone: string;
}

/**
 * CreativeSubject interface
 * @description Represents the thing being advertised, based only on user-provided facts.
 *            Maps to data-model.contract.yaml CreativeSubject entity.
 */
export interface CreativeSubject {
  id: string;
  tenant_id: string;
  project_id: string;
  subject_type: SubjectType;
  name: string;
  description: string | null;
  landing_url: string | null;
  price: number | null;
  currency: string | null;
  /** Claims that can be used in advertising */
  allowed_claims: string[];
  /** Claims that must not appear in ads */
  forbidden_claims: string[];
  /** Fields where data is missing */
  unknown_fields: string[];
  /** Source of the subject data */
  source: SubjectSource;
  created_at: string;
  updated_at: string;
}

/**
 * SourceAsset interface
 * @description Stores user-provided visual references for video generation.
 */
export interface SourceAsset {
  id: string;
  tenant_id: string;
  project_id: string;
  asset_type: "image" | "video" | "url";
  source: "upload" | "external_url" | "generated" | "mock";
  url: string;
  storage_key: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  checksum: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * GenerationRequest interface
 * @description Captures user input and generation settings for video variants.
 */
export interface GenerationRequest {
  id: string;
  tenant_id: string;
  project_id: string;
  creative_subject_id: string;
  source_asset_ids: string[];
  status: "draft" | "prompt_compiled" | "generating" | "completed" | "failed" | "canceled";
  objective: "awareness" | "traffic" | "conversions" | "engagement" | "app_promotion" | "lead_generation" | "unknown";
  target_audience: string | null;
  platform: "meta_ads" | "google_ads" | "tiktok" | "reels" | "youtube_shorts" | "generic_vertical" | "unknown";
  language: string;
  tone: string | null;
  style: string | null;
  call_to_action: string | null;
  duration_seconds: number;
  aspect_ratio: "9:16" | "1:1" | "4:5" | "16:9" | "unknown";
  user_notes: string | null;
  fallback_notes: string[];
  created_at: string;
  updated_at: string;
}

/**
 * AIBehaviorOutput interface
 * @description Main output from MCP scoring and intelligence layer.
 *            Required fields per docs/layers/mcp-layer.contract.md
 */
export interface AIBehaviorOutput {
  /** Product ID being analyzed */
  product_id: string;
  /** Recommendation decision */
  recommendation: Recommendation;
  /** Scoring metrics */
  scores: Scores;
  /** Audience summary */
  audience_summary: AudienceSummary;
  /** Generated creative brief content */
  creative_brief: CreativeBriefContent;
  /** Notes about missing data or fallback triggers */
  fallback_notes: FallbackNote[];
  /** Generation metadata */
  metadata: OutputMetadata;
}

/**
 * Create a basic AIBehaviorOutput with required fields
 * @param productId - Product ID
 * @param metadata - Output metadata
 * @returns AIBehaviorOutput with default values
 */
export function createBasicAIBehaviorOutput(productId: string, metadata: OutputMetadata): AIBehaviorOutput {
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
export function areScoresValid(scores: Scores): boolean {
  const scoreValues = [
    scores.hype_score,
    scores.trend_potential_score,
    scores.sales_velocity,
    scores.stock_movement,
    scores.new_product_boost,
    scores.audience_fit
  ];

  return scoreValues.every(
    (score) => typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 100
  );
}

/**
 * Validate AIBehaviorOutput structure
 * @param output - Output to validate
 * @returns true if valid
 */
export function isAIBehaviorOutput(output: unknown): output is AIBehaviorOutput {
  if (!output || typeof output !== "object") {
    return false;
  }

  const out = output as Record<string, unknown>;

  // Required fields check
  if (typeof out.product_id !== "string") return false;
  if (!out.recommendation || typeof out.recommendation !== "object") return false;
  if (!out.scores || typeof out.scores !== "object") return false;
  if (!out.audience_summary || typeof out.audience_summary !== "object") return false;
  if (!out.creative_brief || typeof out.creative_brief !== "object") return false;
  if (!Array.isArray(out.fallback_notes)) return false;
  if (!out.metadata || typeof out.metadata !== "object") return false;

  // Metadata validation
  const meta = out.metadata as Record<string, unknown>;
  if (typeof meta.llm_used !== "boolean") return false;
  if (typeof meta.llm_available !== "boolean") return false;
  if (!isValidGenerationMethod(meta.generation_method)) return false;
  if (!isValidConfidence(meta.confidence)) return false;

  // Scores validation
  if (!areScoresValid(out.scores as Scores)) return false;

  return true;
}

/**
 * Clone AIBehaviorOutput safely
 * @param output - Output to clone
 * @returns Deep copy of output
 */
export function cloneAIBehaviorOutput(output: AIBehaviorOutput): AIBehaviorOutput {
  return JSON.parse(JSON.stringify(output));
}
