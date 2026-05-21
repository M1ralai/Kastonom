/**
 * MCP Core Types - Enums
 * @module mcp/types/enums
 * @file MCP-001: Core TypeScript Enums and Type Unions
 * @description Strict enums and type unions for MCP layer.
 *            No 'any' typing allowed; untyped inputs require explicit coercion.
 */
/**
 * Valid TenantMode values
 */
export const TENANT_MODES = ["demo", "live"];
/**
 * Valid TenantStatus values
 */
export const TENANT_STATUSES = ["active", "disabled"];
/**
 * Valid SubjectType values
 */
export const SUBJECT_TYPES = [
    "product",
    "service",
    "brand",
    "offer",
    "event",
    "place",
    "other",
    "unknown"
];
/**
 * Valid SubjectSource values
 */
export const SUBJECT_SOURCES = ["user_input", "import", "mock", "unknown"];
/**
 * Valid AssetType values
 */
export const ASSET_TYPES = ["image", "video", "url"];
/**
 * Valid AssetSource values
 */
export const ASSET_SOURCES = ["upload", "external_url", "generated", "mock"];
/**
 * Valid Objective values
 */
export const OBJECTIVES = [
    "awareness",
    "traffic",
    "conversions",
    "engagement",
    "app_promotion",
    "lead_generation",
    "unknown"
];
/**
 * Valid Platform values
 */
export const PLATFORMS = [
    "meta_ads",
    "google_ads",
    "tiktok",
    "reels",
    "youtube_shorts",
    "generic_vertical",
    "unknown"
];
/**
 * Valid AdPlatform values
 */
export const AD_PLATFORMS = ["meta_ads", "google_ads"];
/**
 * Valid AspectRatio values
 */
export const ASPECT_RATIOS = ["9:16", "1:1", "4:5", "16:9", "unknown"];
/**
 * Valid GenerationStatus values
 */
export const GENERATION_STATUSES = [
    "draft",
    "prompt_compiled",
    "generating",
    "completed",
    "failed",
    "canceled"
];
/**
 * Valid VideoJobStatus values
 */
export const VIDEO_JOB_STATUSES = [
    "queued",
    "submitted",
    "processing",
    "completed",
    "failed",
    "canceled"
];
/**
 * Valid GeneratedVideoStatus values
 */
export const GENERATED_VIDEO_STATUSES = [
    "generated",
    "selected",
    "rejected",
    "published",
    "unavailable"
];
/**
 * Valid PublicationStatus values
 */
export const PUBLICATION_STATUSES = [
    "draft",
    "publishing",
    "published",
    "failed",
    "paused",
    "archived"
];
/**
 * Valid MetricSource values
 */
export const METRIC_SOURCES = [
    "meta_ads_api",
    "google_ads_api",
    "mock",
    "manual",
    "unknown"
];
/**
 * Valid SuggestionStatus values
 */
export const SUGGESTION_STATUSES = [
    "suggested",
    "accepted",
    "dismissed",
    "generated",
    "failed"
];
/**
 * Valid Confidence values
 */
export const CONFIDENCE_VALUES = ["low", "medium", "high"];
/**
 * Valid VideoProvider values
 */
export const VIDEO_PROVIDERS = ["pollo", "kling", "runway"];
/**
 * Valid GenerationMethod values
 */
export const GENERATION_METHODS = ["llm", "rule_based", "hybrid"];
// ============================================
// Type Guards
// ============================================
/**
 * Validate TenantMode
 * @param value - Value to validate
 * @returns true if valid TenantMode
 */
export function isValidTenantMode(value) {
    return typeof value === "string" && TENANT_MODES.includes(value);
}
/**
 * Validate TenantStatus
 * @param value - Value to validate
 * @returns true if valid TenantStatus
 */
export function isValidTenantStatus(value) {
    return typeof value === "string" && TENANT_STATUSES.includes(value);
}
/**
 * Validate SubjectType
 * @param value - Value to validate
 * @returns true if valid SubjectType
 */
export function isValidSubjectType(value) {
    return typeof value === "string" && SUBJECT_TYPES.includes(value);
}
/**
 * Validate SubjectSource
 * @param value - Value to validate
 * @returns true if valid SubjectSource
 */
export function isValidSubjectSource(value) {
    return typeof value === "string" && SUBJECT_SOURCES.includes(value);
}
/**
 * Validate AssetType
 * @param value - Value to validate
 * @returns true if valid AssetType
 */
export function isValidAssetType(value) {
    return typeof value === "string" && ASSET_TYPES.includes(value);
}
/**
 * Validate AssetSource
 * @param value - Value to validate
 * @returns true if valid AssetSource
 */
export function isValidAssetSource(value) {
    return typeof value === "string" && ASSET_SOURCES.includes(value);
}
/**
 * Validate Objective
 * @param value - Value to validate
 * @returns true if valid Objective
 */
export function isValidObjective(value) {
    return typeof value === "string" && OBJECTIVES.includes(value);
}
/**
 * Validate Platform
 * @param value - Value to validate
 * @returns true if valid Platform
 */
export function isValidPlatform(value) {
    return typeof value === "string" && PLATFORMS.includes(value);
}
/**
 * Validate AdPlatform
 * @param value - Value to validate
 * @returns true if valid AdPlatform
 */
export function isValidAdPlatform(value) {
    return typeof value === "string" && AD_PLATFORMS.includes(value);
}
/**
 * Validate AspectRatio
 * @param value - Value to validate
 * @returns true if valid AspectRatio
 */
export function isValidAspectRatio(value) {
    return typeof value === "string" && ASPECT_RATIOS.includes(value);
}
/**
 * Validate GenerationStatus
 * @param value - Value to validate
 * @returns true if valid GenerationStatus
 */
export function isValidGenerationStatus(value) {
    return typeof value === "string" && GENERATION_STATUSES.includes(value);
}
/**
 * Validate VideoJobStatus
 * @param value - Value to validate
 * @returns true if valid VideoJobStatus
 */
export function isValidVideoJobStatus(value) {
    return typeof value === "string" && VIDEO_JOB_STATUSES.includes(value);
}
/**
 * Validate GeneratedVideoStatus
 * @param value - Value to validate
 * @returns true if valid GeneratedVideoStatus
 */
export function isValidGeneratedVideoStatus(value) {
    return typeof value === "string" && GENERATED_VIDEO_STATUSES.includes(value);
}
/**
 * Validate PublicationStatus
 * @param value - Value to validate
 * @returns true if valid PublicationStatus
 */
export function isValidPublicationStatus(value) {
    return typeof value === "string" && PUBLICATION_STATUSES.includes(value);
}
/**
 * Validate MetricSource
 * @param value - Value to validate
 * @returns true if valid MetricSource
 */
export function isValidMetricSource(value) {
    return typeof value === "string" && METRIC_SOURCES.includes(value);
}
/**
 * Validate SuggestionStatus
 * @param value - Value to validate
 * @returns true if valid SuggestionStatus
 */
export function isValidSuggestionStatus(value) {
    return typeof value === "string" && SUGGESTION_STATUSES.includes(value);
}
/**
 * Validate Confidence
 * @param value - Value to validate
 * @returns true if valid Confidence
 */
export function isValidConfidence(value) {
    return typeof value === "string" && CONFIDENCE_VALUES.includes(value);
}
/**
 * Validate VideoProvider
 * @param value - Value to validate
 * @returns true if valid VideoProvider
 */
export function isValidVideoProvider(value) {
    return typeof value === "string" && VIDEO_PROVIDERS.includes(value);
}
/**
 * Validate GenerationMethod
 * @param value - Value to validate
 * @returns true if valid GenerationMethod
 */
export function isValidGenerationMethod(value) {
    return typeof value === "string" && GENERATION_METHODS.includes(value);
}
//# sourceMappingURL=enums.js.map