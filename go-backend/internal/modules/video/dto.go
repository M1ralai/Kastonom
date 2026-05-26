package video

import "github.com/M1ralai/Kastonom/backend/internal/shared/domain"

type VideoJobResponse struct {
	VideoJob        domain.VideoJob         `json:"video_job"`
	ProviderResult  *domain.ProviderResult  `json:"provider_result"`
	GeneratedVideos []domain.GeneratedVideo `json:"generated_videos"`
	FallbackReason  *string                 `json:"fallback_reason"`
}

type FullVideoJobResponse struct {
	VideoJob          FullVideoJobDTO              `json:"video_job"`
	GeneratedVideos   []GeneratedVideoPreviewDTO   `json:"generated_videos"`
	Project           ProjectSummaryDTO            `json:"project"`
	CreativeSubject   *CreativeSubjectPreviewDTO   `json:"creative_subject"`
	GenerationRequest *GenerationRequestPreviewDTO `json:"generation_request"`
}

type FullVideoJobDTO struct {
	ID             string  `json:"id"`
	Status         string  `json:"status"`
	Provider       string  `json:"provider"`
	IsMock         bool    `json:"is_mock"`
	FallbackReason *string `json:"fallback_reason"`
	CreatedAt      string  `json:"created_at"`
}
type GeneratedVideoPreviewDTO struct {
	ID              string  `json:"id"`
	URL             string  `json:"url"`
	ThumbnailURL    *string `json:"thumbnail_url"`
	DurationSeconds *int    `json:"duration_seconds"`
	AspectRatio     string  `json:"aspect_ratio"`
	Status          string  `json:"status"`
	IsSelected      bool    `json:"is_selected"`
}
type ProjectSummaryDTO struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}
type CreativeSubjectPreviewDTO struct {
	ID   string  `json:"id"`
	Name string  `json:"name"`
	Img  *string `json:"img"`
}
type GenerationRequestPreviewDTO struct {
	Platform     string  `json:"platform"`
	Tone         *string `json:"tone"`
	Style        *string `json:"style"`
	CallToAction *string `json:"call_to_action"`
}

type SelectGeneratedVideoRequest struct {
	ProjectID string `json:"project_id"`
}
type SelectGeneratedVideoResponse struct {
	CreativeProject domain.CreativeProject `json:"creative_project"`
	GeneratedVideo  domain.GeneratedVideo  `json:"generated_video"`
}
