package generation

import "github.com/M1ralai/Kastonom/backend/internal/shared/domain"

type CreateGenerationRequestRequest struct {
	ProjectID       string   `json:"project_id"`
	SourceAssetIDs  []string `json:"source_asset_ids"`
	Provider        string   `json:"provider"`
	Objective       string   `json:"objective"`
	TargetAudience  *string  `json:"target_audience"`
	Platform        string   `json:"platform"`
	DurationSeconds int      `json:"duration_seconds"`
	AspectRatio     string   `json:"aspect_ratio"`
	Language        string   `json:"language"`
	Tone            *string  `json:"tone"`
	Style           *string  `json:"style"`
	CallToAction    *string  `json:"call_to_action"`
	UserNotes       *string  `json:"user_notes"`
}

type GenerationRequestResponse struct {
	GenerationRequest domain.GenerationRequest `json:"generation_request"`
	PromptPayload     domain.PromptPayload     `json:"prompt_payload"`
	VideoJob          domain.VideoJob          `json:"video_job"`
	ProviderResult    *domain.ProviderResult   `json:"provider_result"`
	GeneratedVideos   []domain.GeneratedVideo  `json:"generated_videos"`
	FallbackReason    *string                  `json:"fallback_reason"`
}

type EstimateCostRequest struct {
	Platform        string `json:"platform"`
	DurationSeconds int    `json:"duration_seconds"`
	AspectRatio     string `json:"aspect_ratio"`
}

type EstimateCostResponse struct {
	EstimatedCredits int              `json:"estimated_credits"`
	EstimatedCost    EstimatedCostDTO `json:"estimated_cost"`
}

type EstimatedCostDTO struct {
	Amount    int    `json:"amount"`
	Currency  string `json:"currency"`
	MaxAmount int    `json:"max_amount"`
}
