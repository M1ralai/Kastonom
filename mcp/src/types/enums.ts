/**
 * MCP Core Types - Enums
 * @module mcp/types/enums
 * @file MCP-001: Core TypeScript Enums and Type Unions
 * @description Strict enums and type unions for MCP layer.
 *            No 'any' typing allowed; untyped inputs require explicit coercion.
 */

/**
 * Tenant operating mode
 * @description Determines whether the tenant operates in demo or live mode.
 * - 'demo': Limited functionality, mock data only, no live provider calls
 * - 'live': Full functionality, may call live providers
 */
export type TenantMode = "demo" | "live";

/**
 * Valid TenantMode values
 */
export const TENANT_MODES: TenantMode[] = ["demo", "live"];

/**
 * Tenant account status
 * @description Determines whether the tenant account is active.
 * - 'active': Account is operational
 * - 'disabled': Account is suspended or deactivated
 */
export type TenantStatus = "active" | "disabled";

/**
 * Valid TenantStatus values
 */
export const TENANT_STATUSES: TenantStatus[] = ["active", "disabled"];

/**
 * Subject type for the advertised item
 * @description The category of thing being advertised.
 */
export type SubjectType =
  | "product"
  | "service"
  | "brand"
  | "offer"
  | "event"
  | "place"
  | "other"
  | "unknown";

/**
 * Valid SubjectType values
 */
export const SUBJECT_TYPES: SubjectType[] = [
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
 * Source of the subject data
 * @description Where the advertised subject facts originated.
 */
export type SubjectSource = "user_input" | "import" | "mock" | "unknown";

/**
 * Valid SubjectSource values
 */
export const SUBJECT_SOURCES: SubjectSource[] = ["user_input", "import", "mock", "unknown"];

/**
 * Source asset type
 * @description The type of visual asset provided.
 */
export type AssetType = "image" | "video" | "url";

/**
 * Valid AssetType values
 */
export const ASSET_TYPES: AssetType[] = ["image", "video", "url"];

/**
 * Source of the asset
 * @description Where the asset was obtained.
 */
export type AssetSource = "upload" | "external_url" | "generated" | "mock";

/**
 * Valid AssetSource values
 */
export const ASSET_SOURCES: AssetSource[] = ["upload", "external_url", "generated", "mock"];

/**
 * Campaign advertising objective
 * @description The primary goal of the ad campaign.
 */
export type Objective =
  | "awareness"
  | "traffic"
  | "conversions"
  | "engagement"
  | "app_promotion"
  | "lead_generation"
  | "unknown";

/**
 * Valid Objective values
 */
export const OBJECTIVES: Objective[] = [
  "awareness",
  "traffic",
  "conversions",
  "engagement",
  "app_promotion",
  "lead_generation",
  "unknown"
];

/**
 * Ad platform target
 * @description The platform where the ad will be published.
 */
export type Platform =
  | "meta_ads"
  | "google_ads"
  | "tiktok"
  | "reels"
  | "youtube_shorts"
  | "generic_vertical"
  | "unknown";

/**
 * Valid Platform values
 */
export const PLATFORMS: Platform[] = [
  "meta_ads",
  "google_ads",
  "tiktok",
  "reels",
  "youtube_shorts",
  "generic_vertical",
  "unknown"
];

/**
 * Ad platform for publication
 * @description Only supported ad publishing platforms.
 */
export type AdPlatform = "meta_ads" | "google_ads";

/**
 * Valid AdPlatform values
 */
export const AD_PLATFORMS: AdPlatform[] = ["meta_ads", "google_ads"];

/**
 * Video aspect ratio
 * @description The aspect ratio for the generated video.
 */
export type AspectRatio = "9:16" | "1:1" | "4:5" | "16:9" | "unknown";

/**
 * Valid AspectRatio values
 */
export const ASPECT_RATIOS: AspectRatio[] = ["9:16", "1:1", "4:5", "16:9", "unknown"];

/**
 * Generation request status
 * @description The lifecycle state of a generation request.
 */
export type GenerationStatus =
  | "draft"
  | "prompt_compiled"
  | "generating"
  | "completed"
  | "failed"
  | "canceled";

/**
 * Valid GenerationStatus values
 */
export const GENERATION_STATUSES: GenerationStatus[] = [
  "draft",
  "prompt_compiled",
  "generating",
  "completed",
  "failed",
  "canceled"
];

/**
 * Video job status
 * @description The lifecycle state of a video generation job.
 */
export type VideoJobStatus =
  | "queued"
  | "submitted"
  | "processing"
  | "completed"
  | "failed"
  | "canceled";

/**
 * Valid VideoJobStatus values
 */
export const VIDEO_JOB_STATUSES: VideoJobStatus[] = [
  "queued",
  "submitted",
  "processing",
  "completed",
  "failed",
  "canceled"
];

/**
 * Generated video status
 * @description The state of a generated video variant.
 */
export type GeneratedVideoStatus =
  | "generated"
  | "selected"
  | "rejected"
  | "published"
  | "unavailable";

/**
 * Valid GeneratedVideoStatus values
 */
export const GENERATED_VIDEO_STATUSES: GeneratedVideoStatus[] = [
  "generated",
  "selected",
  "rejected",
  "published",
  "unavailable"
];

/**
 * Publication status
 * @description The state of an ad publication.
 */
export type PublicationStatus =
  | "draft"
  | "publishing"
  | "published"
  | "failed"
  | "paused"
  | "archived";

/**
 * Valid PublicationStatus values
 */
export const PUBLICATION_STATUSES: PublicationStatus[] = [
  "draft",
  "publishing",
  "published",
  "failed",
  "paused",
  "archived"
];

/**
 * Metrics source
 * @description Where ad metrics data originated.
 */
export type MetricSource = "meta_ads_api" | "google_ads_api" | "mock" | "manual" | "unknown";

/**
 * Valid MetricSource values
 */
export const METRIC_SOURCES: MetricSource[] = [
  "meta_ads_api",
  "google_ads_api",
  "mock",
  "manual",
  "unknown"
];

/**
 * Suggestion status
 * @description The lifecycle state of a creative iteration suggestion.
 */
export type SuggestionStatus =
  | "suggested"
  | "accepted"
  | "dismissed"
  | "generated"
  | "failed";

/**
 * Valid SuggestionStatus values
 */
export const SUGGESTION_STATUSES: SuggestionStatus[] = [
  "suggested",
  "accepted",
  "dismissed",
  "generated",
  "failed"
];

/**
 * Confidence level
 * @description The confidence in the output quality.
 */
export type Confidence = "low" | "medium" | "high";

/**
 * Valid Confidence values
 */
export const CONFIDENCE_VALUES: Confidence[] = ["low", "medium", "high"];

/**
 * Video provider
 * @description Supported AI video generation providers.
 * All providers are accessed through Pollo AI gateway.
 */
export type VideoProvider = "pollo" | "kling" | "runway";

/**
 * Valid VideoProvider values
 */
export const VIDEO_PROVIDERS: VideoProvider[] = ["pollo", "kling", "runway"];

/**
 * Generation method
 * @description How the output was generated.
 */
export type GenerationMethod = "llm" | "rule_based" | "hybrid";

/**
 * Valid GenerationMethod values
 */
export const GENERATION_METHODS: GenerationMethod[] = ["llm", "rule_based", "hybrid"];

// ============================================
// Type Guards
// ============================================

/**
 * Validate TenantMode
 * @param value - Value to validate
 * @returns true if valid TenantMode
 */
export function isValidTenantMode(value: unknown): value is TenantMode {
  return typeof value === "string" && TENANT_MODES.includes(value as TenantMode);
}

/**
 * Validate TenantStatus
 * @param value - Value to validate
 * @returns true if valid TenantStatus
 */
export function isValidTenantStatus(value: unknown): value is TenantStatus {
  return typeof value === "string" && TENANT_STATUSES.includes(value as TenantStatus);
}

/**
 * Validate SubjectType
 * @param value - Value to validate
 * @returns true if valid SubjectType
 */
export function isValidSubjectType(value: unknown): value is SubjectType {
  return typeof value === "string" && SUBJECT_TYPES.includes(value as SubjectType);
}

/**
 * Validate SubjectSource
 * @param value - Value to validate
 * @returns true if valid SubjectSource
 */
export function isValidSubjectSource(value: unknown): value is SubjectSource {
  return typeof value === "string" && SUBJECT_SOURCES.includes(value as SubjectSource);
}

/**
 * Validate AssetType
 * @param value - Value to validate
 * @returns true if valid AssetType
 */
export function isValidAssetType(value: unknown): value is AssetType {
  return typeof value === "string" && ASSET_TYPES.includes(value as AssetType);
}

/**
 * Validate AssetSource
 * @param value - Value to validate
 * @returns true if valid AssetSource
 */
export function isValidAssetSource(value: unknown): value is AssetSource {
  return typeof value === "string" && ASSET_SOURCES.includes(value as AssetSource);
}

/**
 * Validate Objective
 * @param value - Value to validate
 * @returns true if valid Objective
 */
export function isValidObjective(value: unknown): value is Objective {
  return typeof value === "string" && OBJECTIVES.includes(value as Objective);
}

/**
 * Validate Platform
 * @param value - Value to validate
 * @returns true if valid Platform
 */
export function isValidPlatform(value: unknown): value is Platform {
  return typeof value === "string" && PLATFORMS.includes(value as Platform);
}

/**
 * Validate AdPlatform
 * @param value - Value to validate
 * @returns true if valid AdPlatform
 */
export function isValidAdPlatform(value: unknown): value is AdPlatform {
  return typeof value === "string" && AD_PLATFORMS.includes(value as AdPlatform);
}

/**
 * Validate AspectRatio
 * @param value - Value to validate
 * @returns true if valid AspectRatio
 */
export function isValidAspectRatio(value: unknown): value is AspectRatio {
  return typeof value === "string" && ASPECT_RATIOS.includes(value as AspectRatio);
}

/**
 * Validate GenerationStatus
 * @param value - Value to validate
 * @returns true if valid GenerationStatus
 */
export function isValidGenerationStatus(value: unknown): value is GenerationStatus {
  return typeof value === "string" && GENERATION_STATUSES.includes(value as GenerationStatus);
}

/**
 * Validate VideoJobStatus
 * @param value - Value to validate
 * @returns true if valid VideoJobStatus
 */
export function isValidVideoJobStatus(value: unknown): value is VideoJobStatus {
  return typeof value === "string" && VIDEO_JOB_STATUSES.includes(value as VideoJobStatus);
}

/**
 * Validate GeneratedVideoStatus
 * @param value - Value to validate
 * @returns true if valid GeneratedVideoStatus
 */
export function isValidGeneratedVideoStatus(value: unknown): value is GeneratedVideoStatus {
  return typeof value === "string" && GENERATED_VIDEO_STATUSES.includes(value as GeneratedVideoStatus);
}

/**
 * Validate PublicationStatus
 * @param value - Value to validate
 * @returns true if valid PublicationStatus
 */
export function isValidPublicationStatus(value: unknown): value is PublicationStatus {
  return typeof value === "string" && PUBLICATION_STATUSES.includes(value as PublicationStatus);
}

/**
 * Validate MetricSource
 * @param value - Value to validate
 * @returns true if valid MetricSource
 */
export function isValidMetricSource(value: unknown): value is MetricSource {
  return typeof value === "string" && METRIC_SOURCES.includes(value as MetricSource);
}

/**
 * Validate SuggestionStatus
 * @param value - Value to validate
 * @returns true if valid SuggestionStatus
 */
export function isValidSuggestionStatus(value: unknown): value is SuggestionStatus {
  return typeof value === "string" && SUGGESTION_STATUSES.includes(value as SuggestionStatus);
}

/**
 * Validate Confidence
 * @param value - Value to validate
 * @returns true if valid Confidence
 */
export function isValidConfidence(value: unknown): value is Confidence {
  return typeof value === "string" && CONFIDENCE_VALUES.includes(value as Confidence);
}

/**
 * Validate VideoProvider
 * @param value - Value to validate
 * @returns true if valid VideoProvider
 */
export function isValidVideoProvider(value: unknown): value is VideoProvider {
  return typeof value === "string" && VIDEO_PROVIDERS.includes(value as VideoProvider);
}

/**
 * Validate GenerationMethod
 * @param value - Value to validate
 * @returns true if valid GenerationMethod
 */
export function isValidGenerationMethod(value: unknown): value is GenerationMethod {
  return typeof value === "string" && GENERATION_METHODS.includes(value as GenerationMethod);
}
