/**
 * Frontend API Service - Communicates with Backend
 * @description Handles all API calls to the backend, with fallback support
 */

import type {
  HealthResponse,
  CreativeProject,
  CreativeSubject,
  SourceAsset,
  GenerationRequest,
  PromptPayload,
  VideoJob,
  GeneratedVideo,
  ProviderResult,
  AdPublication,
  AdMetricsSnapshot,
  ProductDisplay,
  ScoreBreakdown,
  VideoJobStatus,
  Platform,
  VideoProvider,
  AdPlatform,
  AspectRatio,
  GenerationObjective,
} from "../types/api";

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const DEMO_TENANT_ID = "demo-tenant";

/**
 * Get headers for API requests
 */
function getHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-tenant-id": DEMO_TENANT_ID,
  };
}

/**
 * Generic API request handler
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

/**
 * Health Check
 */
export async function checkHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>("/health");
}

/**
 * Demo Fallback - Get complete demo state
 */
export async function getDemoFallback(): Promise<{
  creative_project: CreativeProject;
  creative_subject: CreativeSubject;
  source_assets: SourceAsset[];
  generation_request: GenerationRequest;
  prompt_payload: PromptPayload;
  video_job: VideoJob;
  provider_result: ProviderResult;
  generated_videos: GeneratedVideo[];
  selected_generated_video: GeneratedVideo | null;
  ad_publication: AdPublication | null;
  metrics_snapshot: AdMetricsSnapshot | null;
  fallback_reason: string;
}> {
  return apiRequest("/demo/fallback");
}

// ─── Creative Projects ─────────────────────────────────────────

export interface CreateProjectInput {
  name: string;
  creative_subject: {
    subject_type: "product" | "service" | "brand" | "offer" | "event" | "place" | "other" | "unknown";
    name: string;
    description?: string;
    landing_url?: string;
    price?: number;
    currency?: string;
    allowed_claims: string[];
    forbidden_claims: string[];
    unknown_fields: string[];
    source: "user_input" | "import" | "mock" | "unknown";
  };
  source_assets?: {
    asset_type: "image" | "video" | "url";
    source: "upload" | "external_url" | "generated" | "mock";
    url: string;
    metadata?: Record<string, unknown>;
  }[];
}

export async function createCreativeProject(input: CreateProjectInput): Promise<{
  creative_project: CreativeProject;
  creative_subject: CreativeSubject;
  source_assets: SourceAsset[];
  fallback_reason: string | null;
}> {
  return apiRequest("/creative-projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getCreativeProject(projectId: string): Promise<{
  creative_project: CreativeProject;
  creative_subject: CreativeSubject;
  source_assets: SourceAsset[];
  generation_requests: GenerationRequest[];
  generated_videos: GeneratedVideo[];
}> {
  return apiRequest(`/creative-projects/${projectId}`);
}

// ─── Generation Requests ────────────────────────────────────────

export interface CreateGenerationRequestInput {
  project_id: string;
  source_asset_ids: string[];
  provider?: VideoProvider;
  objective: GenerationObjective;
  target_audience?: string;
  platform: Platform;
  duration_seconds: number;
  aspect_ratio: AspectRatio;
  language: string;
  tone?: string;
  style?: string;
  call_to_action?: string;
  user_notes?: string;
}

export async function createGenerationRequest(input: CreateGenerationRequestInput): Promise<{
  generation_request: GenerationRequest;
  prompt_payload: PromptPayload;
  video_job: VideoJob;
  provider_result: ProviderResult | null;
  generated_videos: GeneratedVideo[];
  fallback_reason: string | null;
}> {
  return apiRequest("/generation-requests", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ─── Video Jobs ────────────────────────────────────────────────

export async function getVideoJob(jobId: string): Promise<{
  video_job: VideoJob;
  provider_result: ProviderResult | null;
  generated_videos: GeneratedVideo[];
  fallback_reason: string | null;
}> {
  return apiRequest(`/video-jobs/${jobId}`);
}

// ─── Generated Videos ──────────────────────────────────────────

export async function selectGeneratedVideo(
  videoId: string,
  projectId: string
): Promise<{
  creative_project: CreativeProject;
  generated_video: GeneratedVideo;
}> {
  return apiRequest(`/generated-videos/${videoId}/select`, {
    method: "POST",
    body: JSON.stringify({ project_id: projectId }),
  });
}

// ─── Ad Publications ──────────────────────────────────────────

export interface CreateAdPublicationInput {
  project_id: string;
  generated_video_id: string;
  platform: AdPlatform;
  ad_platform_connection_id?: string;
  destination_url?: string;
  user_confirmed_publish: boolean;
}

export async function createAdPublication(input: CreateAdPublicationInput): Promise<{
  ad_publication: AdPublication;
  fallback_reason: string | null;
}> {
  return apiRequest("/ad-publications", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function syncMetrics(
  adPublicationId: string,
  input: {
    source: "meta_ads_api" | "google_ads_api" | "mock" | "manual" | "unknown";
    date_start: string;
    date_end: string;
    metrics?: {
      impressions?: number;
      clicks?: number;
      spend?: number;
      ctr?: number;
      cpc?: number;
      conversions?: number;
      roas?: number;
      video_views?: number;
    };
  }
): Promise<{
  metrics_snapshot: AdMetricsSnapshot;
}> {
  return apiRequest(`/ad-publications/${adPublicationId}/metrics/sync`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ─── Mock Data Fallbacks ────────────────────────────────────────

/**
 * Mock products for demo fallback when backend is unavailable
 */
export const MOCK_PRODUCTS: ProductDisplay[] = [
  {
    id: "prod-001",
    name: "Erkek Koşu Ayakkabısı Pro X",
    sku: "SKU-4421",
    category: "Spor",
    price: 1299,
    currency: "TRY",
    stock: "248 adet",
    score: 87,
    reasons: [
      "Arama hacmi %40 arttı",
      "Sepet terk oranı düşük",
      "Rakip stok azaldı"
    ],
    margin: "42%",
    img: "👟",
    creative_subject_id: "cs-001",
  },
  {
    id: "prod-002",
    name: "Bluetooth Kulaklık Wave 200",
    sku: "SKU-2981",
    category: "Elektronik",
    price: 899,
    currency: "TRY",
    stock: "115 adet",
    score: 73,
    reasons: [
      "Yaz sezonu talebi yüksek",
      "Sosyal medya trendi",
      "Geri dönüş oranı düşük"
    ],
    margin: "38%",
    img: "🎧",
    creative_subject_id: "cs-002",
  },
  {
    id: "prod-003",
    name: "Ergonomik Sırt Çantası Kids",
    sku: "SKU-7734",
    category: "Çocuk",
    price: 649,
    currency: "TRY",
    stock: "430 adet",
    score: 65,
    reasons: [
      "Okul sezonu yaklaşıyor",
      "Kâr marjı güçlü",
      "Yorumlar pozitif"
    ],
    margin: "55%",
    img: "🎒",
    creative_subject_id: "cs-003",
  },
];

/**
 * Mock score breakdown for product insights
 */
export const MOCK_SCORE_BREAKDOWN: ScoreBreakdown = {
  hype_score: 87,
  trend_potential: 82,
  sales_velocity: 78,
  stock_movement: "Artış",
  new_product_boost: false,
  audience_fit: "18-45 Erkek, Spor & Outdoor ilgi alanı",
  recommendation_reason: "Arama hacminde %40 artış ve mevsimsel talep yüksekliği tespit edildi.",
};

/**
 * Mock generated videos for preview
 */
export const MOCK_GENERATED_VIDEOS: GeneratedVideo[] = [
  {
    id: "gv-001",
    tenant_id: DEMO_TENANT_ID,
    project_id: "proj-001",
    generation_request_id: "gr-001",
    video_job_id: "vj-001",
    url: "https://example.com/video-a.mp4",
    thumbnail_url: "https://example.com/thumb-a.jpg",
    duration_seconds: 15,
    aspect_ratio: "9:16",
    status: "generated",
    is_selected: false,
    is_mock: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "gv-002",
    tenant_id: DEMO_TENANT_ID,
    project_id: "proj-001",
    generation_request_id: "gr-001",
    video_job_id: "vj-001",
    url: "https://example.com/video-b.mp4",
    thumbnail_url: "https://example.com/thumb-b.jpg",
    duration_seconds: 15,
    aspect_ratio: "9:16",
    status: "generated",
    is_selected: false,
    is_mock: true,
    created_at: new Date().toISOString(),
  },
];

/**
 * Mock ad metrics for performance page
 */
export const MOCK_METRICS: AdMetricsSnapshot = {
  id: "metrics-001",
  tenant_id: DEMO_TENANT_ID,
  ad_publication_id: "pub-001",
  platform: "meta_ads",
  date_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  date_end: new Date().toISOString().split("T")[0],
  impressions: 45000,
  clicks: 1080,
  spend: 1240,
  currency: "TRY",
  ctr: 2.4,
  cpc: 1.15,
  conversions: 42,
  conversion_value: 42000,
  roas: 3.2,
  video_views: 28000,
  video_view_rate: 62,
  cost_per_video_view: 0.04,
  source: "mock",
  fetched_at: new Date().toISOString(),
};

/**
 * Mock ad platforms for publish page
 */
export const MOCK_AD_PLATFORMS = [
  { name: "Meta Ads", icon: "📘", connected: true, account: "Kastonom Official · ID:1048290" },
  { name: "Google Ads", icon: "🔍", connected: true, account: "kastonom@ads.google · MCC aktif" },
  { name: "TikTok Ads", icon: "🎵", connected: false, account: "Bağlı değil" },
];

// ─── State Management ───────────────────────────────────────────

export interface AppState {
  // Current user session
  tenantId: string;

  // Current project
  currentProject: CreativeProject | null;
  currentSubject: CreativeSubject | null;
  currentAssets: SourceAsset[];

  // Current generation
  currentGenerationRequest: GenerationRequest | null;
  currentVideoJob: VideoJob | null;
  currentGeneratedVideos: GeneratedVideo[];

  // Current selection
  selectedVideo: GeneratedVideo | null;

  // Current publication
  currentPublication: AdPublication | null;
  currentMetrics: AdMetricsSnapshot | null;

  // UI State
  isLoading: boolean;
  isDemoMode: boolean;
  error: string | null;
}

export const initialAppState: AppState = {
  tenantId: DEMO_TENANT_ID,
  currentProject: null,
  currentSubject: null,
  currentAssets: [],
  currentGenerationRequest: null,
  currentVideoJob: null,
  currentGeneratedVideos: [],
  selectedVideo: null,
  currentPublication: null,
  currentMetrics: null,
  isLoading: false,
  isDemoMode: true,
  error: null,
};

// ─── Polling Helper ────────────────────────────────────────────

export interface PollVideoJobOptions {
  jobId: string;
  onStatusChange?: (status: VideoJobStatus, videoJob: VideoJob) => void;
  onComplete?: (videos: GeneratedVideo[]) => void;
  onError?: (error: string) => void;
  intervalMs?: number;
  maxAttempts?: number;
}

export async function pollVideoJob(options: PollVideoJobOptions): Promise<{
  videoJob: VideoJob;
  generatedVideos: GeneratedVideo[];
}> {
  const {
    jobId,
    onStatusChange,
    onComplete,
    onError,
    intervalMs = 2000,
    maxAttempts = 30,
  } = options;

  let attempts = 0;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const result = await getVideoJob(jobId);
        const { video_job, generated_videos } = result;

        if (onStatusChange) {
          onStatusChange(video_job.status, video_job);
        }

        if (video_job.status === "completed") {
          if (onComplete) onComplete(generated_videos);
          resolve({ videoJob: video_job, generatedVideos: generated_videos });
          return;
        }

        if (video_job.status === "failed") {
          const errorMsg = video_job.error_message || "Video generation failed";
          if (onError) onError(errorMsg);
          reject(new Error(errorMsg));
          return;
        }

        if (video_job.status === "canceled") {
          reject(new Error("Video job was canceled"));
          return;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          reject(new Error("Video job polling timed out"));
          return;
        }

        setTimeout(poll, intervalMs);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        if (onError) onError(errorMsg);
        reject(error);
      }
    };

    poll();
  });
}
