/**
 * Frontend API Types - Matches data-model.contract.yaml
 * These types represent the API contract between frontend and backend
 */

// Core types from data model contract

export type TenantMode = "demo" | "live";
export type TenantStatus = "active" | "disabled";

export type SubjectType = "product" | "service" | "brand" | "offer" | "event" | "place" | "other" | "unknown";
export type AssetSource = "upload" | "external_url" | "generated" | "mock";
export type AssetType = "image" | "video" | "url";

export type GenerationObjective = "awareness" | "traffic" | "conversions" | "engagement" | "app_promotion" | "lead_generation" | "unknown";
export type Platform = "meta_ads" | "google_ads" | "tiktok" | "reels" | "youtube_shorts" | "generic_vertical" | "unknown";
export type AspectRatio = "9:16" | "1:1" | "4:5" | "16:9" | "unknown";

export type GenerationRequestStatus = "draft" | "prompt_compiled" | "generating" | "completed" | "failed" | "canceled";
export type VideoJobStatus = "queued" | "submitted" | "processing" | "completed" | "failed" | "canceled";
export type ProjectStatus = "draft" | "generating" | "ready" | "published" | "archived" | "failed";
export type GeneratedVideoStatus = "generated" | "selected" | "rejected" | "published" | "unavailable";
export type AdPublicationStatus = "draft" | "publishing" | "published" | "failed" | "paused" | "archived";
export type VideoProvider = "pollo" | "kling" | "runway";
export type AdPlatform = "meta_ads" | "google_ads";
export type MetricsSource = "meta_ads_api" | "google_ads_api" | "mock" | "manual" | "unknown";

// Tenant
export interface Tenant {
  id: string;
  name: string;
  mode: TenantMode;
  status: TenantStatus;
  created_at: string;
  updated_at: string;
}

// Creative Subject
export interface CreativeSubject {
  id: string;
  tenant_id: string;
  project_id: string;
  subject_type: SubjectType;
  name: string;
  description?: string;
  landing_url?: string;
  price?: number;
  currency?: string;
  allowed_claims: string[];
  forbidden_claims: string[];
  unknown_fields: string[];
  source: "user_input" | "import" | "mock" | "unknown";
  created_at: string;
  updated_at: string;
}

// Source Asset
export interface SourceAsset {
  id: string;
  tenant_id: string;
  project_id: string;
  asset_type: AssetType;
  source: AssetSource;
  url: string;
  storage_key?: string;
  mime_type?: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
  checksum?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// Creative Project
export interface CreativeProject {
  id: string;
  tenant_id: string;
  name: string;
  status: ProjectStatus;
  selected_generated_video_id?: string;
  latest_generation_request_id?: string;
  created_at: string;
  updated_at: string;
}

// Generation Request
export interface GenerationRequest {
  id: string;
  tenant_id: string;
  project_id: string;
  creative_subject_id: string;
  source_asset_ids: string[];
  status: GenerationRequestStatus;
  objective: GenerationObjective;
  target_audience?: string;
  platform: Platform;
  language: string;
  tone?: string;
  style?: string;
  call_to_action?: string;
  duration_seconds: number;
  aspect_ratio: AspectRatio;
  user_notes?: string;
  fallback_notes: string[];
  created_at: string;
  updated_at: string;
}

// Prompt Payload
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
  provider_options?: Record<string, unknown>;
  is_mock: boolean;
  fallback_notes: string[];
  created_at: string;
}

// Video Job
export interface VideoJob {
  id: string;
  tenant_id: string;
  project_id: string;
  generation_request_id: string;
  prompt_payload_id: string;
  provider: VideoProvider;
  status: VideoJobStatus;
  provider_job_id?: string;
  is_mock: boolean;
  fallback_reason?: string;
  error_code?: string;
  error_message?: string;
  attempt_count: number;
  created_at: string;
  submitted_at?: string;
  completed_at?: string;
  updated_at: string;
}

// Provider Result
export interface ProviderResult {
  id: string;
  tenant_id: string;
  video_job_id: string;
  provider: VideoProvider;
  provider_job_id?: string;
  raw_status?: string;
  normalized_status: VideoJobStatus;
  result_urls: string[];
  error_code?: string;
  error_message?: string;
  redacted_metadata?: Record<string, unknown>;
  received_at: string;
}

// Generated Video
export interface GeneratedVideo {
  id: string;
  tenant_id: string;
  project_id: string;
  generation_request_id: string;
  video_job_id: string;
  provider_result_id?: string;
  url: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  aspect_ratio: AspectRatio;
  status: GeneratedVideoStatus;
  is_selected: boolean;
  is_mock: boolean;
  created_at: string;
  selected_at?: string;
}

// Ad Platform Connection
export interface AdPlatformConnection {
  id: string;
  tenant_id: string;
  platform: AdPlatform;
  external_account_id?: string;
  external_account_name?: string;
  status: "not_connected" | "connected" | "expired" | "disabled" | "error";
  scopes: string[];
  last_checked_at?: string;
  created_at: string;
  updated_at: string;
}

// Ad Publication
export interface AdPublication {
  id: string;
  tenant_id: string;
  project_id: string;
  generated_video_id: string;
  ad_platform_connection_id?: string;
  platform: AdPlatform;
  status: AdPublicationStatus;
  external_campaign_id?: string;
  external_ad_group_id?: string;
  external_ad_id?: string;
  destination_url?: string;
  published_at?: string;
  paused_at?: string;
  error_code?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// Ad Metrics Snapshot
export interface AdMetricsSnapshot {
  id: string;
  tenant_id: string;
  ad_publication_id: string;
  platform: AdPlatform;
  date_start: string;
  date_end: string;
  impressions?: number;
  clicks?: number;
  spend?: number;
  currency?: string;
  ctr?: number;
  cpc?: number;
  conversions?: number;
  conversion_value?: number;
  roas?: number;
  video_views?: number;
  video_view_rate?: number;
  cost_per_video_view?: number;
  source: MetricsSource;
  redacted_metadata?: Record<string, unknown>;
  fetched_at: string;
}

// Health Check Response
export interface HealthResponse {
  status: "ok" | "degraded";
  mode: "mock" | "live" | "degraded";
  version: string;
  video_provider_readiness: Record<string, { ready: boolean; error?: string }>;
  ad_platform_readiness: Record<string, { ready: boolean; error?: string }>;
}

// API Error Response
export interface ApiError {
  error: string;
  message: string;
  fallback_available?: boolean;
}

// Product for frontend display (aggregated from CreativeSubject + metrics)
export interface ProductDisplay {
  id: string;
  name: string;
  sku?: string;
  category: string;
  price?: number;
  currency?: string;
  stock?: string;
  score: number;
  reasons: string[];
  margin?: string;
  img?: string;
  creative_subject_id: string;
  project_id?: string;
}

// Hype Score breakdown
export interface ScoreBreakdown {
  hype_score: number;
  trend_potential: number;
  sales_velocity: number;
  stock_movement: string;
  new_product_boost: boolean;
  audience_fit: string;
  recommendation_reason: string;
}
