/**
 * MCP Core Types - Module Exports
 * @module mcp/types
 * @file MCP-001: Type Definitions Index
 * @description Clean module exports for all MCP type definitions.
 *            Import from this file to access all types.
 */

// Enums and Type Guards
export {
  // Types
  TenantMode,
  TenantStatus,
  SubjectType,
  SubjectSource,
  AssetType,
  AssetSource,
  Objective,
  Platform,
  AdPlatform,
  AspectRatio,
  GenerationStatus,
  VideoJobStatus,
  GeneratedVideoStatus,
  PublicationStatus,
  MetricSource,
  SuggestionStatus,
  Confidence,
  VideoProvider,
  GenerationMethod,

  // Constants
  TENANT_MODES,
  TENANT_STATUSES,
  SUBJECT_TYPES,
  SUBJECT_SOURCES,
  ASSET_TYPES,
  ASSET_SOURCES,
  OBJECTIVES,
  PLATFORMS,
  AD_PLATFORMS,
  ASPECT_RATIOS,
  GENERATION_STATUSES,
  VIDEO_JOB_STATUSES,
  GENERATED_VIDEO_STATUSES,
  PUBLICATION_STATUSES,
  METRIC_SOURCES,
  SUGGESTION_STATUSES,
  CONFIDENCE_VALUES,
  VIDEO_PROVIDERS,
  GENERATION_METHODS,

  // Type Guards
  isValidTenantMode,
  isValidTenantStatus,
  isValidSubjectType,
  isValidSubjectSource,
  isValidAssetType,
  isValidAssetSource,
  isValidObjective,
  isValidPlatform,
  isValidAdPlatform,
  isValidAspectRatio,
  isValidGenerationStatus,
  isValidVideoJobStatus,
  isValidGeneratedVideoStatus,
  isValidPublicationStatus,
  isValidMetricSource,
  isValidSuggestionStatus,
  isValidConfidence,
  isValidVideoProvider,
  isValidGenerationMethod
} from "./enums.js";

// Tenant Context
export {
  TenantContext,
  CreateTenantContextOptions,
  createTenantContext,
  isTenantContext,
  isDemoTenant,
  isActiveTenant,
  isLiveTenant,
  cloneTenantContext,
  getDemoTenantContext
} from "./tenant.js";

// AI Behavior Output
export {
  Scores,
  createDefaultScores,
  Recommendation,
  AudienceSummary,
  createDefaultAudienceSummary,
  OutputMetadata,
  createRuleBasedMetadata,
  createLLMMetadata,
  FallbackNote,
  CreativeBriefContent,
  CreativeSubject,
  SourceAsset,
  GenerationRequest,
  AIBehaviorOutput,
  createBasicAIBehaviorOutput,
  areScoresValid,
  isAIBehaviorOutput,
  cloneAIBehaviorOutput
} from "./ai-behavior.js";

// Product Metrics
export {
  ProductMetrics,
  createDefaultProductMetrics,
  hasScoringData,
  hasAudienceData,
  AdMetrics,
  createDefaultAdMetrics,
  AD_METRIC_THRESHOLDS,
  isCtrLow,
  isVideoViewRateLow,
  isCostPerVideoViewHigh,
  isRoasLow,
  isValidProductMetrics,
  isValidAdMetrics
} from "./metrics.js";

// ============================================
// Re-exports for convenience (interface definitions)
// ============================================

import type {
  VideoProvider,
  AspectRatio,
  SuggestionStatus,
  Confidence,
  VideoJobStatus
} from "./enums.js";

/**
 * Prompt Payload interface for MCP-004
 * @description Compiled provider prompt data
 */
export interface PromptPayload {
  id: string;
  tenant_id: string;
  project_id: string;
  generation_request_id: string;
  provider: VideoProvider;
  prompt_text: string;
  negative_prompt: string;
  language: string;
  duration_seconds: number;
  aspect_ratio: AspectRatio;
  source_asset_ids: string[];
  provider_options: Record<string, unknown>;
  is_mock: boolean;
  fallback_reason: string | null;
  created_at: string;
}

/**
 * Creative Iteration Suggestion interface for MCP-005
 * @description Metric-informed iteration suggestion
 */
export interface CreativeIterationSuggestion {
  id: string;
  tenant_id: string;
  project_id: string;
  ad_publication_id: string | null;
  metrics_snapshot_id: string | null;
  base_generation_request_id: string | null;
  new_generation_request_id: string | null;
  status: SuggestionStatus;
  reason: string;
  metric_drivers: string[];
  suggested_changes: {
    opening: string | null;
    hook: string | null;
    cta: string | null;
    angle: string | null;
    pacing: string | null;
  };
  confidence: Confidence;
  fallback_notes: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Provider Result interface for MCP-007
 * @description Normalized provider response
 */
export interface ProviderResult {
  id: string;
  tenant_id: string;
  video_job_id: string;
  provider: VideoProvider;
  provider_job_id: string | null;
  raw_status: string | null;
  normalized_status: VideoJobStatus;
  result_urls: string[];
  error_code: string | null;
  error_message: string | null;
  redacted_metadata: Record<string, unknown>;
  received_at: string;
}

// ============================================
// Version and Contract Info
// ============================================

/**
 * MCP type definitions version
 * Matches MCP-001 contract version
 */
export const MCP_TYPES_VERSION = "1.0.0";

/**
 * Supported contract versions
 */
export const SUPPORTED_CONTRACT_VERSIONS = ["1.0.0"] as const;

/**
 * Check if a version is supported
 * @param version - Version string to check
 * @returns true if version is supported
 */
export function isSupportedVersion(version: string): boolean {
  return SUPPORTED_CONTRACT_VERSIONS.includes(version as (typeof SUPPORTED_CONTRACT_VERSIONS)[number]);
}
