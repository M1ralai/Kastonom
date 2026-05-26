package dto

import "github.com/M1ralai/Kastonom/backend/internal/shared/domain"

type CreateAdPublicationRequest struct {
	ProjectID              string  `json:"project_id" validate:"required"`
	GeneratedVideoID       string  `json:"generated_video_id" validate:"required"`
	Platform               string  `json:"platform" validate:"required,ad_platform"`
	AdPlatformConnectionID *string `json:"ad_platform_connection_id"`
	DestinationURL         *string `json:"destination_url" validate:"omitempty,url"`
	UserConfirmedPublish   bool    `json:"user_confirmed_publish" validate:"eq=true"`
}
type CreateAdPublicationResponse struct {
	AdPublication  domain.AdPublication `json:"ad_publication"`
	FallbackReason *string              `json:"fallback_reason"`
}
type SyncMetricsRequest struct {
	Source    string          `json:"source" validate:"required,metrics_source"`
	DateStart string          `json:"date_start" validate:"required,datetime=2006-01-02"`
	DateEnd   string          `json:"date_end" validate:"required,datetime=2006-01-02"`
	Metrics   *MetricInputDTO `json:"metrics"`
}
type MetricInputDTO struct {
	Impressions      *int64   `json:"impressions" validate:"omitempty,gte=0"`
	Clicks           *int64   `json:"clicks" validate:"omitempty,gte=0"`
	Spend            *float64 `json:"spend" validate:"omitempty,gte=0"`
	Currency         *string  `json:"currency"`
	CTR              *float64 `json:"ctr" validate:"omitempty,gte=0"`
	CPC              *float64 `json:"cpc" validate:"omitempty,gte=0"`
	Conversions      *float64 `json:"conversions" validate:"omitempty,gte=0"`
	ConversionValue  *float64 `json:"conversion_value" validate:"omitempty,gte=0"`
	ROAS             *float64 `json:"roas" validate:"omitempty,gte=0"`
	VideoViews       *int64   `json:"video_views" validate:"omitempty,gte=0"`
	VideoViewRate    *float64 `json:"video_view_rate" validate:"omitempty,gte=0"`
	CostPerVideoView *float64 `json:"cost_per_video_view" validate:"omitempty,gte=0"`
}
type SyncMetricsResponse struct {
	MetricsSnapshot domain.AdMetricsSnapshot `json:"metrics_snapshot"`
}
