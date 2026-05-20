/**
 * MCP Core Types - Module Exports
 * @module mcp/types
 * @file MCP-001: Type Definitions Index
 * @description Clean module exports for all MCP type definitions.
 *            Import from this file to access all types.
 */
// Enums and Type Guards
export { 
// Constants
TENANT_MODES, TENANT_STATUSES, SUBJECT_TYPES, SUBJECT_SOURCES, ASSET_TYPES, ASSET_SOURCES, OBJECTIVES, PLATFORMS, AD_PLATFORMS, ASPECT_RATIOS, GENERATION_STATUSES, VIDEO_JOB_STATUSES, GENERATED_VIDEO_STATUSES, PUBLICATION_STATUSES, METRIC_SOURCES, SUGGESTION_STATUSES, CONFIDENCE_VALUES, VIDEO_PROVIDERS, GENERATION_METHODS, 
// Type Guards
isValidTenantMode, isValidTenantStatus, isValidSubjectType, isValidSubjectSource, isValidAssetType, isValidAssetSource, isValidObjective, isValidPlatform, isValidAdPlatform, isValidAspectRatio, isValidGenerationStatus, isValidVideoJobStatus, isValidGeneratedVideoStatus, isValidPublicationStatus, isValidMetricSource, isValidSuggestionStatus, isValidConfidence, isValidVideoProvider, isValidGenerationMethod } from "./enums.js";
// Tenant Context
export { createTenantContext, isTenantContext, isDemoTenant, isActiveTenant, isLiveTenant, cloneTenantContext, getDemoTenantContext } from "./tenant.js";
// AI Behavior Output
export { createDefaultScores, createDefaultAudienceSummary, createRuleBasedMetadata, createLLMMetadata, createBasicAIBehaviorOutput, areScoresValid, isAIBehaviorOutput, cloneAIBehaviorOutput } from "./ai-behavior.js";
// Product Metrics
export { createDefaultProductMetrics, hasScoringData, hasAudienceData, createDefaultAdMetrics, AD_METRIC_THRESHOLDS, isCtrLow, isVideoViewRateLow, isCostPerVideoViewHigh, isRoasLow, isValidProductMetrics, isValidAdMetrics } from "./metrics.js";
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
export const SUPPORTED_CONTRACT_VERSIONS = ["1.0.0"];
/**
 * Check if a version is supported
 * @param version - Version string to check
 * @returns true if version is supported
 */
export function isSupportedVersion(version) {
    return SUPPORTED_CONTRACT_VERSIONS.includes(version);
}
//# sourceMappingURL=index.js.map