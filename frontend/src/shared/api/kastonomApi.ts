/**
 * Frontend API Service - Communicates with Backend
 * @description Handles all API calls to the backend
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
  VideoJobStatus,
  Platform,
  VideoProvider,
  AdPlatform,
  AspectRatio,
  GenerationObjective,
} from "@/shared/types/api";

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Auth token storage key
const AUTH_TOKEN_KEY = "kastonom_auth_token";
const AUTH_USER_KEY = "kastonom_auth_user";

// Auth types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  tenant_id: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  tenant?: {
    id: string;
    name: string;
  };
}

// Token management
export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function getAuthUser(): AuthUser | null {
  const userStr = localStorage.getItem(AUTH_USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuthUser(user: AuthUser): void {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}


// ─── Auth API ────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<AuthResponse> {
  const url = `${API_BASE_URL}/auth/login`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Login failed" }));
    throw new Error(error.message || "Login failed");
  }

  const result = await response.json();

  // Store token and user
  setAuthToken(result.token);
  setAuthUser(result.user);

  return result;
}

export async function register(email: string, password: string, name: string, companyName?: string): Promise<AuthResponse> {
  const url = `${API_BASE_URL}/auth/register`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      name,
      company_name: companyName
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Registration failed" }));
    throw new Error(error.message || "Registration failed");
  }

  const result = await response.json();

  // Store token and user
  setAuthToken(result.token);
  if (result.tenant) {
    setAuthUser({ ...result.user, tenant_id: result.tenant.id });
  }

  return result;
}

export function logout(): void {
  clearAuthToken();
}

/**
 * Get headers for API requests (with auth token and tenant_id)
 */
function getHeaders(): HeadersInit {
  const token = getAuthToken();
  const user = getAuthUser();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (user?.tenant_id) {
    headers["x-tenant-id"] = user.tenant_id;
  }

  return headers;
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

// ─── Dashboard Endpoints ──────────────────────────────────────

export interface KpiSummary {
  monthly_video_count: number;
  monthly_video_change: number;
  remaining_credits: number;
  credit_currency: string;
  average_ctr: number;
  sector_average_ctr: number;
  ctr_change_percent: number;
}

export async function getKpiSummary(): Promise<KpiSummary> {
  return apiRequest<KpiSummary>("/dashboard/kpi-summary");
}

export interface RecentActivity {
  id: string;
  project_id: string;
  project_name: string;
  status: string;
  icon: string;
  generated_video: {
    impressions: number;
    ctr: number;
  } | null;
  updated_at: string;
}

export interface RecentActivitiesResponse {
  activities: RecentActivity[];
}

export async function getRecentActivities(limit: number = 10): Promise<RecentActivitiesResponse> {
  return apiRequest<RecentActivitiesResponse>(`/dashboard/recent-activities?limit=${limit}`);
}

// ─── Tenant Endpoints ─────────────────────────────────────────

export interface TenantCredits {
  tenant_id: string;
  current_credits: number;
  credit_currency: string;
  monthly_allowance: number;
  used_this_month: number;
  videos_per_credit: number;
}

export async function getTenantCredits(): Promise<TenantCredits> {
  return apiRequest<TenantCredits>("/tenant/credits");
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

export async function listCreativeProjects(): Promise<Array<{
  creative_project: CreativeProject;
  creative_subject: CreativeSubject | null;
  source_assets: SourceAsset[];
}>> {
  return apiRequest("/creative-projects");
}

// ─── Project Metrics ───────────────────────────────────────────

export interface ProjectMetrics {
  project_id: string;
  creative_subject: {
    id: string;
    name: string;
    price: number | null;
    currency: string | null;
    margin_percent: number | null;
    stock_count: number | null;
    ai_score: number;
    ai_reasons: string[];
  };
  erp_data: {
    stock_available: number | null;
    stock_reserved: number | null;
    last_sync_at: string | null;
  };
}

export async function getProjectMetrics(projectId: string): Promise<ProjectMetrics> {
  return apiRequest<ProjectMetrics>(`/creative-projects/${projectId}/metrics`);
}

// ─── Source Assets Upload ───────────────────────────────────────

export async function uploadSourceAsset(file: File): Promise<{
  source_asset: SourceAsset;
  upload_url: string;
}> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("asset_type", "image");
  formData.append("source", "upload");

  const token = getAuthToken();
  const user = getAuthUser();
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (user?.tenant_id) {
    headers["x-tenant-id"] = user.tenant_id;
  }

  const response = await fetch(`${API_BASE_URL}/source-assets/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Upload failed" }));
    throw new Error(error.message || "Görsel yüklenemedi");
  }

  return response.json();
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

export interface EstimateCostInput {
  platform: Platform;
  duration_seconds: number;
  aspect_ratio: AspectRatio;
}

export interface EstimateCostResponse {
  estimated_credits: number;
  estimated_cost: {
    amount: number;
    currency: string;
    max_amount: number;
  };
}

export async function estimateCost(input: EstimateCostInput): Promise<EstimateCostResponse> {
  return apiRequest<EstimateCostResponse>("/generation-requests/estimate-cost", {
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

export interface VideoJobFullResponse {
  video_job: {
    id: string;
    status: string;
    created_at: string;
  };
  generated_videos: Array<{
    id: string;
    url: string;
    thumbnail_url: string | null;
    duration_seconds: number | null;
    aspect_ratio: string;
    status: string;
    is_selected: boolean;
  }>;
  project: {
    id: string;
    name: string;
  };
  creative_subject: {
    id: string;
    name: string;
    img: string | null;
  } | null;
  generation_request: {
    platform: string;
    tone: string | null;
    style: string | null;
    call_to_action: string | null;
  } | null;
}

export async function getVideoJobFull(jobId: string): Promise<VideoJobFullResponse> {
  return apiRequest<VideoJobFullResponse>(`/video-jobs/${jobId}/full`);
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
  error: string | null;
}

export const initialAppState: AppState = {
  tenantId: "",
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
  error: null,
};

// ─── Polling Helper ───────────────────────────────────────────

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