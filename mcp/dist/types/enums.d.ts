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
export declare const TENANT_MODES: TenantMode[];
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
export declare const TENANT_STATUSES: TenantStatus[];
/**
 * Subject type for the advertised item
 * @description The category of thing being advertised.
 */
export type SubjectType = "product" | "service" | "brand" | "offer" | "event" | "place" | "other" | "unknown";
/**
 * Valid SubjectType values
 */
export declare const SUBJECT_TYPES: SubjectType[];
/**
 * Source of the subject data
 * @description Where the advertised subject facts originated.
 */
export type SubjectSource = "user_input" | "import" | "mock" | "unknown";
/**
 * Valid SubjectSource values
 */
export declare const SUBJECT_SOURCES: SubjectSource[];
/**
 * Source asset type
 * @description The type of visual asset provided.
 */
export type AssetType = "image" | "video" | "url";
/**
 * Valid AssetType values
 */
export declare const ASSET_TYPES: AssetType[];
/**
 * Source of the asset
 * @description Where the asset was obtained.
 */
export type AssetSource = "upload" | "external_url" | "generated" | "mock";
/**
 * Valid AssetSource values
 */
export declare const ASSET_SOURCES: AssetSource[];
/**
 * Campaign advertising objective
 * @description The primary goal of the ad campaign.
 */
export type Objective = "awareness" | "traffic" | "conversions" | "engagement" | "app_promotion" | "lead_generation" | "unknown";
/**
 * Valid Objective values
 */
export declare const OBJECTIVES: Objective[];
/**
 * Ad platform target
 * @description The platform where the ad will be published.
 */
export type Platform = "meta_ads" | "google_ads" | "tiktok" | "reels" | "youtube_shorts" | "generic_vertical" | "unknown";
/**
 * Valid Platform values
 */
export declare const PLATFORMS: Platform[];
/**
 * Ad platform for publication
 * @description Only supported ad publishing platforms.
 */
export type AdPlatform = "meta_ads" | "google_ads";
/**
 * Valid AdPlatform values
 */
export declare const AD_PLATFORMS: AdPlatform[];
/**
 * Video aspect ratio
 * @description The aspect ratio for the generated video.
 */
export type AspectRatio = "9:16" | "1:1" | "4:5" | "16:9" | "unknown";
/**
 * Valid AspectRatio values
 */
export declare const ASPECT_RATIOS: AspectRatio[];
/**
 * Generation request status
 * @description The lifecycle state of a generation request.
 */
export type GenerationStatus = "draft" | "prompt_compiled" | "generating" | "completed" | "failed" | "canceled";
/**
 * Valid GenerationStatus values
 */
export declare const GENERATION_STATUSES: GenerationStatus[];
/**
 * Video job status
 * @description The lifecycle state of a video generation job.
 */
export type VideoJobStatus = "queued" | "submitted" | "processing" | "completed" | "failed" | "canceled";
/**
 * Valid VideoJobStatus values
 */
export declare const VIDEO_JOB_STATUSES: VideoJobStatus[];
/**
 * Generated video status
 * @description The state of a generated video variant.
 */
export type GeneratedVideoStatus = "generated" | "selected" | "rejected" | "published" | "unavailable";
/**
 * Valid GeneratedVideoStatus values
 */
export declare const GENERATED_VIDEO_STATUSES: GeneratedVideoStatus[];
/**
 * Publication status
 * @description The state of an ad publication.
 */
export type PublicationStatus = "draft" | "publishing" | "published" | "failed" | "paused" | "archived";
/**
 * Valid PublicationStatus values
 */
export declare const PUBLICATION_STATUSES: PublicationStatus[];
/**
 * Metrics source
 * @description Where ad metrics data originated.
 */
export type MetricSource = "meta_ads_api" | "google_ads_api" | "mock" | "manual" | "unknown";
/**
 * Valid MetricSource values
 */
export declare const METRIC_SOURCES: MetricSource[];
/**
 * Suggestion status
 * @description The lifecycle state of a creative iteration suggestion.
 */
export type SuggestionStatus = "suggested" | "accepted" | "dismissed" | "generated" | "failed";
/**
 * Valid SuggestionStatus values
 */
export declare const SUGGESTION_STATUSES: SuggestionStatus[];
/**
 * Confidence level
 * @description The confidence in the output quality.
 */
export type Confidence = "low" | "medium" | "high";
/**
 * Valid Confidence values
 */
export declare const CONFIDENCE_VALUES: Confidence[];
/**
 * Video provider
 * @description Supported AI video generation providers.
 * All providers are accessed through Pollo AI gateway.
 */
export type VideoProvider = "pollo" | "kling" | "runway";
/**
 * Valid VideoProvider values
 */
export declare const VIDEO_PROVIDERS: VideoProvider[];
/**
 * Generation method
 * @description How the output was generated.
 */
export type GenerationMethod = "llm" | "rule_based" | "hybrid";
/**
 * Valid GenerationMethod values
 */
export declare const GENERATION_METHODS: GenerationMethod[];
/**
 * Validate TenantMode
 * @param value - Value to validate
 * @returns true if valid TenantMode
 */
export declare function isValidTenantMode(value: unknown): value is TenantMode;
/**
 * Validate TenantStatus
 * @param value - Value to validate
 * @returns true if valid TenantStatus
 */
export declare function isValidTenantStatus(value: unknown): value is TenantStatus;
/**
 * Validate SubjectType
 * @param value - Value to validate
 * @returns true if valid SubjectType
 */
export declare function isValidSubjectType(value: unknown): value is SubjectType;
/**
 * Validate SubjectSource
 * @param value - Value to validate
 * @returns true if valid SubjectSource
 */
export declare function isValidSubjectSource(value: unknown): value is SubjectSource;
/**
 * Validate AssetType
 * @param value - Value to validate
 * @returns true if valid AssetType
 */
export declare function isValidAssetType(value: unknown): value is AssetType;
/**
 * Validate AssetSource
 * @param value - Value to validate
 * @returns true if valid AssetSource
 */
export declare function isValidAssetSource(value: unknown): value is AssetSource;
/**
 * Validate Objective
 * @param value - Value to validate
 * @returns true if valid Objective
 */
export declare function isValidObjective(value: unknown): value is Objective;
/**
 * Validate Platform
 * @param value - Value to validate
 * @returns true if valid Platform
 */
export declare function isValidPlatform(value: unknown): value is Platform;
/**
 * Validate AdPlatform
 * @param value - Value to validate
 * @returns true if valid AdPlatform
 */
export declare function isValidAdPlatform(value: unknown): value is AdPlatform;
/**
 * Validate AspectRatio
 * @param value - Value to validate
 * @returns true if valid AspectRatio
 */
export declare function isValidAspectRatio(value: unknown): value is AspectRatio;
/**
 * Validate GenerationStatus
 * @param value - Value to validate
 * @returns true if valid GenerationStatus
 */
export declare function isValidGenerationStatus(value: unknown): value is GenerationStatus;
/**
 * Validate VideoJobStatus
 * @param value - Value to validate
 * @returns true if valid VideoJobStatus
 */
export declare function isValidVideoJobStatus(value: unknown): value is VideoJobStatus;
/**
 * Validate GeneratedVideoStatus
 * @param value - Value to validate
 * @returns true if valid GeneratedVideoStatus
 */
export declare function isValidGeneratedVideoStatus(value: unknown): value is GeneratedVideoStatus;
/**
 * Validate PublicationStatus
 * @param value - Value to validate
 * @returns true if valid PublicationStatus
 */
export declare function isValidPublicationStatus(value: unknown): value is PublicationStatus;
/**
 * Validate MetricSource
 * @param value - Value to validate
 * @returns true if valid MetricSource
 */
export declare function isValidMetricSource(value: unknown): value is MetricSource;
/**
 * Validate SuggestionStatus
 * @param value - Value to validate
 * @returns true if valid SuggestionStatus
 */
export declare function isValidSuggestionStatus(value: unknown): value is SuggestionStatus;
/**
 * Validate Confidence
 * @param value - Value to validate
 * @returns true if valid Confidence
 */
export declare function isValidConfidence(value: unknown): value is Confidence;
/**
 * Validate VideoProvider
 * @param value - Value to validate
 * @returns true if valid VideoProvider
 */
export declare function isValidVideoProvider(value: unknown): value is VideoProvider;
/**
 * Validate GenerationMethod
 * @param value - Value to validate
 * @returns true if valid GenerationMethod
 */
export declare function isValidGenerationMethod(value: unknown): value is GenerationMethod;
//# sourceMappingURL=enums.d.ts.map