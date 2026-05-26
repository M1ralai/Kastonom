package demo

import "github.com/M1ralai/Kastonom/backend/internal/shared/domain"

type DemoFallbackResponse struct {
	CreativeProject             *domain.CreativeProject             `json:"creative_project"`
	CreativeSubject             *domain.CreativeSubject             `json:"creative_subject"`
	SourceAssets                []domain.SourceAsset                `json:"source_assets"`
	GenerationRequest           *domain.GenerationRequest           `json:"generation_request"`
	PromptPayload               *domain.PromptPayload               `json:"prompt_payload"`
	VideoJob                    *domain.VideoJob                    `json:"video_job"`
	ProviderResult              *domain.ProviderResult              `json:"provider_result"`
	GeneratedVideos             []domain.GeneratedVideo             `json:"generated_videos"`
	SelectedGeneratedVideo      *domain.GeneratedVideo              `json:"selected_generated_video"`
	AdPublication               *domain.AdPublication               `json:"ad_publication"`
	MetricsSnapshot             *domain.AdMetricsSnapshot           `json:"metrics_snapshot"`
	CreativeIterationSuggestion *domain.CreativeIterationSuggestion `json:"creative_iteration_suggestion"`
	FallbackReason              string                              `json:"fallback_reason"`
}
