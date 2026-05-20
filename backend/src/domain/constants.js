export const MODES = ["mock", "live"];

export const VIDEO_PROVIDERS = ["mock", "pollo", "kling", "runway"];

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

export const SUBJECT_SOURCES = ["user_input", "import", "mock", "unknown"];

export const ASSET_TYPES = ["image", "video", "url"];

export const ASSET_SOURCES = ["upload", "external_url", "generated", "mock"];

export const OBJECTIVES = [
  "awareness",
  "traffic",
  "conversions",
  "engagement",
  "app_promotion",
  "lead_generation",
  "unknown"
];

export const PLATFORMS = [
  "meta_ads",
  "google_ads",
  "tiktok",
  "reels",
  "youtube_shorts",
  "generic_vertical",
  "unknown"
];

export const AD_PLATFORMS = ["meta_ads", "google_ads"];

export const ASPECT_RATIOS = ["9:16", "1:1", "4:5", "16:9", "unknown"];

export const GENERATION_STATUSES = [
  "draft",
  "prompt_compiled",
  "generating",
  "completed",
  "failed",
  "canceled"
];

export const VIDEO_JOB_STATUSES = [
  "queued",
  "submitted",
  "processing",
  "completed",
  "failed",
  "canceled"
];

export const GENERATED_VIDEO_STATUSES = [
  "generated",
  "selected",
  "rejected",
  "published",
  "unavailable"
];

export const PUBLICATION_STATUSES = [
  "draft",
  "publishing",
  "published",
  "failed",
  "paused",
  "archived"
];

export const METRIC_SOURCES = [
  "meta_ads_api",
  "google_ads_api",
  "mock",
  "manual",
  "unknown"
];

export const SUGGESTION_STATUSES = [
  "suggested",
  "accepted",
  "dismissed",
  "generated",
  "failed"
];

export const CONFIDENCE_VALUES = ["low", "medium", "high"];

export const STANDARD_NEGATIVE_INSTRUCTIONS = [
  "Do not invent subject claims.",
  "Do not show unavailable features.",
  "Do not imply fake scarcity.",
  "Do not infer audience demographics.",
  "Do not claim discounts unless discount data is provided.",
  "Do not claim guaranteed results.",
  "Do not include medical, legal, financial, or safety claims not present in source data."
];

export const COLLECTIONS = [
  "tenants",
  "creativeProjects",
  "creativeSubjects",
  "sourceAssets",
  "generationRequests",
  "promptPayloads",
  "videoJobs",
  "providerResults",
  "generatedVideos",
  "adPlatformConnections",
  "adPublications",
  "adMetricsSnapshots",
  "creativeIterationSuggestions"
];

export const SECRET_KEY_PATTERN =
  /(api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|client[_-]?secret|password|secret)/i;
