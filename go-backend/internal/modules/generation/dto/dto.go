package dto

import "github.com/M1ralai/Kastonom/backend/internal/shared/domain"

type CreateGenerationRequestRequest struct {
	ProjectID       string   `json:"project_id" validate:"required"`
	SourceAssetIDs  []string `json:"source_asset_ids" validate:"required,dive,required"`
	Provider        string   `json:"provider" validate:"omitempty,video_provider"`
	Objective       string   `json:"objective" validate:"required,objective"`
	TargetAudience  *string  `json:"target_audience"`
	Platform        string   `json:"platform" validate:"required,platform"`
	DurationSeconds int      `json:"duration_seconds" validate:"required,gte=1"`
	AspectRatio     string   `json:"aspect_ratio" validate:"required,aspect_ratio"`
	Language        string   `json:"language" validate:"required,min=2,max=16"`
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
	Platform        string `json:"platform" validate:"required,platform"`
	DurationSeconds int    `json:"duration_seconds" validate:"required,gte=1"`
	AspectRatio     string `json:"aspect_ratio" validate:"required,aspect_ratio"`
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
