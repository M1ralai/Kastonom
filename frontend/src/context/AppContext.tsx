/**
 * App Context - Global State Management
 * @description Provides global state for the frontend application
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from "react";
import type {
  CreativeProject,
  CreativeSubject,
  SourceAsset,
  GenerationRequest,
  VideoJob,
  GeneratedVideo,
  AdPublication,
  AdMetricsSnapshot,
  ProductDisplay,
  ScoreBreakdown,
} from "../types/api";
import {
  checkHealth,
  getDemoFallback,
  createCreativeProject,
  createGenerationRequest,
  getVideoJob,
  selectGeneratedVideo,
  createAdPublication,
  syncMetrics,
  pollVideoJob,
  MOCK_PRODUCTS,
  MOCK_SCORE_BREAKDOWN,
  MOCK_METRICS,
  MOCK_GENERATED_VIDEOS,
  type CreateProjectInput,
  type CreateGenerationRequestInput,
} from "../services/api";

// ─── State Types ────────────────────────────────────────────────

export interface AppState {
  // Mode
  isDemoMode: boolean;
  isLoading: boolean;
  error: string | null;

  // Products
  products: ProductDisplay[];
  selectedProduct: ProductDisplay | null;
  scoreBreakdown: ScoreBreakdown | null;

  // Project
  currentProject: CreativeProject | null;
  currentSubject: CreativeSubject | null;
  currentAssets: SourceAsset[];

  // Generation
  currentGenerationRequest: GenerationRequest | null;
  currentVideoJob: VideoJob | null;
  currentGeneratedVideos: GeneratedVideo[];

  // Selection
  selectedVideo: GeneratedVideo | null;

  // Publication
  currentPublication: AdPublication | null;
  currentMetrics: AdMetricsSnapshot | null;
}

type AppAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_DEMO_MODE"; payload: boolean }
  | { type: "SET_PRODUCTS"; payload: ProductDisplay[] }
  | { type: "SELECT_PRODUCT"; payload: ProductDisplay | null }
  | { type: "SET_SCORE_BREAKDOWN"; payload: ScoreBreakdown | null }
  | { type: "SET_PROJECT"; payload: CreativeProject | null }
  | { type: "SET_SUBJECT"; payload: CreativeSubject | null }
  | { type: "SET_ASSETS"; payload: SourceAsset[] }
  | { type: "SET_GENERATION_REQUEST"; payload: GenerationRequest | null }
  | { type: "SET_VIDEO_JOB"; payload: VideoJob | null }
  | { type: "SET_GENERATED_VIDEOS"; payload: GeneratedVideo[] }
  | { type: "SELECT_VIDEO"; payload: GeneratedVideo | null }
  | { type: "SET_PUBLICATION"; payload: AdPublication | null }
  | { type: "SET_METRICS"; payload: AdMetricsSnapshot | null }
  | { type: "RESET_GENERATION" }
  | { type: "RESET_ALL" };

const initialState: AppState = {
  isDemoMode: true,
  isLoading: false,
  error: null,
  products: [],
  selectedProduct: null,
  scoreBreakdown: null,
  currentProject: null,
  currentSubject: null,
  currentAssets: [],
  currentGenerationRequest: null,
  currentVideoJob: null,
  currentGeneratedVideos: [],
  selectedVideo: null,
  currentPublication: null,
  currentMetrics: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_DEMO_MODE":
      return { ...state, isDemoMode: action.payload };
    case "SET_PRODUCTS":
      return { ...state, products: action.payload };
    case "SELECT_PRODUCT":
      return { ...state, selectedProduct: action.payload };
    case "SET_SCORE_BREAKDOWN":
      return { ...state, scoreBreakdown: action.payload };
    case "SET_PROJECT":
      return { ...state, currentProject: action.payload };
    case "SET_SUBJECT":
      return { ...state, currentSubject: action.payload };
    case "SET_ASSETS":
      return { ...state, currentAssets: action.payload };
    case "SET_GENERATION_REQUEST":
      return { ...state, currentGenerationRequest: action.payload };
    case "SET_VIDEO_JOB":
      return { ...state, currentVideoJob: action.payload };
    case "SET_GENERATED_VIDEOS":
      return { ...state, currentGeneratedVideos: action.payload };
    case "SELECT_VIDEO":
      return { ...state, selectedVideo: action.payload };
    case "SET_PUBLICATION":
      return { ...state, currentPublication: action.payload };
    case "SET_METRICS":
      return { ...state, currentMetrics: action.payload };
    case "RESET_GENERATION":
      return {
        ...state,
        currentGenerationRequest: null,
        currentVideoJob: null,
        currentGeneratedVideos: [],
        selectedVideo: null,
      };
    case "RESET_ALL":
      return initialState;
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  actions: {
    loadProducts: () => Promise<void>;
    selectProduct: (product: ProductDisplay) => void;
    createProject: (input: CreateProjectInput) => Promise<void>;
    startGeneration: (input: CreateGenerationRequestInput) => Promise<void>;
    pollJobStatus: (jobId: string) => Promise<void>;
    selectVideo: (videoId: string) => Promise<void>;
    publishAd: (platform: "meta_ads" | "google_ads") => Promise<void>;
    loadMetrics: () => Promise<void>;
    reset: () => void;
  };
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Check backend health on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const health = await checkHealth();
        dispatch({ type: "SET_DEMO_MODE", payload: health.mode === "mock" });
      } catch {
        dispatch({ type: "SET_DEMO_MODE", payload: true });
      }
    };
    checkBackend();
  }, []);

  const actions = {
    loadProducts: useCallback(async () => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      try {
        const fallback = await getDemoFallback();
        // Map demo fallback to products
        const product: ProductDisplay = {
          id: fallback.creative_project.id,
          name: fallback.creative_subject.name,
          category: fallback.creative_subject.subject_type === "product" ? "Ürün" : "Diğer",
          score: 87, // Default score from demo
          reasons: fallback.creative_subject.allowed_claims,
          creative_subject_id: fallback.creative_subject.id,
          project_id: fallback.creative_project.id,
        };

        dispatch({ type: "SET_PRODUCTS", payload: [product] });
      } catch {
        // Use mock data if backend unavailable
        dispatch({ type: "SET_PRODUCTS", payload: MOCK_PRODUCTS });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    }, []),

    selectProduct: useCallback((product: ProductDisplay) => {
      dispatch({ type: "SELECT_PRODUCT", payload: product });
      dispatch({ type: "SET_SCORE_BREAKDOWN", payload: MOCK_SCORE_BREAKDOWN });
    }, []),

    createProject: useCallback(async (input: CreateProjectInput) => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      try {
        const result = await createCreativeProject(input);
        dispatch({ type: "SET_PROJECT", payload: result.creative_project });
        dispatch({ type: "SET_SUBJECT", payload: result.creative_subject });
        dispatch({ type: "SET_ASSETS", payload: result.source_assets });
      } catch (error) {
        // Fallback to mock project
        const mockProject: CreativeProject = {
          id: "mock-proj-" + Date.now(),
          tenant_id: "demo-tenant",
          name: input.name,
          status: "draft",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        dispatch({ type: "SET_PROJECT", payload: mockProject });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    }, []),

    startGeneration: useCallback(async (input: CreateGenerationRequestInput) => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      try {
        const result = await createGenerationRequest(input);
        dispatch({ type: "SET_GENERATION_REQUEST", payload: result.generation_request });
        dispatch({ type: "SET_VIDEO_JOB", payload: result.video_job });
        dispatch({ type: "SET_GENERATED_VIDEOS", payload: result.generated_videos });
      } catch (error) {
        // Fallback to mock state
        const mockJob: VideoJob = {
          id: "mock-job-" + Date.now(),
          tenant_id: "demo-tenant",
          project_id: input.project_id,
          generation_request_id: "mock-gr-" + Date.now(),
          prompt_payload_id: "mock-pp-" + Date.now(),
          provider: "mock",
          status: "completed",
          is_mock: true,
          fallback_reason: "demo_fallback",
          attempt_count: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        dispatch({ type: "SET_VIDEO_JOB", payload: mockJob });
        dispatch({ type: "SET_GENERATED_VIDEOS", payload: MOCK_GENERATED_VIDEOS });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    }, []),

    pollJobStatus: useCallback(async (jobId: string) => {
      dispatch({ type: "SET_LOADING", payload: true });

      try {
        await pollVideoJob({
          jobId,
          onStatusChange: (status, job) => {
            dispatch({ type: "SET_VIDEO_JOB", payload: job });
          },
          onComplete: (videos) => {
            dispatch({ type: "SET_GENERATED_VIDEOS", payload: videos });
          },
          onError: (error) => {
            dispatch({ type: "SET_ERROR", payload: error });
          },
        });
      } catch (error) {
        // Use mock videos on error
        dispatch({ type: "SET_GENERATED_VIDEOS", payload: MOCK_GENERATED_VIDEOS });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    }, []),

    selectVideo: useCallback(async (videoId: string) => {
      const video = state.currentGeneratedVideos.find((v) => v.id === videoId);
      if (!video) return;

      try {
        if (state.currentProject) {
          const result = await selectGeneratedVideo(videoId, state.currentProject.id);
          dispatch({ type: "SELECT_VIDEO", payload: result.generated_video });
        } else {
          dispatch({ type: "SELECT_VIDEO", payload: { ...video, is_selected: true } });
        }
      } catch {
        dispatch({ type: "SELECT_VIDEO", payload: { ...video, is_selected: true } });
      }
    }, [state.currentGeneratedVideos, state.currentProject]),

    publishAd: useCallback(async (platform: "meta_ads" | "google_ads") => {
      if (!state.selectedVideo || !state.currentProject) {
        dispatch({ type: "SET_ERROR", payload: "No video selected" });
        return;
      }

      dispatch({ type: "SET_LOADING", payload: true });

      try {
        const result = await createAdPublication({
          project_id: state.currentProject.id,
          generated_video_id: state.selectedVideo.id,
          platform,
          user_confirmed_publish: true,
        });
        dispatch({ type: "SET_PUBLICATION", payload: result.ad_publication });
      } catch {
        // Mock publication
        const mockPublication: AdPublication = {
          id: "mock-pub-" + Date.now(),
          tenant_id: "demo-tenant",
          project_id: state.currentProject.id,
          generated_video_id: state.selectedVideo.id,
          platform,
          status: "published",
          published_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        dispatch({ type: "SET_PUBLICATION", payload: mockPublication });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    }, [state.selectedVideo, state.currentProject]),

    loadMetrics: useCallback(async () => {
      if (!state.currentPublication) return;

      dispatch({ type: "SET_LOADING", payload: true });

      try {
        const result = await syncMetrics(state.currentPublication.id, {
          source: "mock",
          date_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          date_end: new Date().toISOString().split("T")[0],
        });
        dispatch({ type: "SET_METRICS", payload: result.metrics_snapshot });
      } catch {
        dispatch({ type: "SET_METRICS", payload: MOCK_METRICS });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    }, [state.currentPublication]),

    reset: useCallback(() => {
      dispatch({ type: "RESET_ALL" });
    }, []),
  };

  return (
    <AppContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </AppContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}
