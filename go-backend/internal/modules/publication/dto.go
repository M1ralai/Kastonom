package publication

import "github.com/M1ralai/Kastonom/backend/internal/shared/domain"

type CreateAdPublicationRequest struct {
	ProjectID              string  `json:"project_id"`
	GeneratedVideoID       string  `json:"generated_video_id"`
	Platform               string  `json:"platform"`
	AdPlatformConnectionID *string `json:"ad_platform_connection_id"`
	DestinationURL         *string `json:"destination_url"`
	UserConfirmedPublish   bool    `json:"user_confirmed_publish"`
}
type CreateAdPublicationResponse struct {
	AdPublication  domain.AdPublication `json:"ad_publication"`
	FallbackReason *string              `json:"fallback_reason"`
}
type SyncMetricsRequest struct {
	Source    string          `json:"source"`
	DateStart string          `json:"date_start"`
	DateEnd   string          `json:"date_end"`
	Metrics   *MetricInputDTO `json:"metrics"`
}
type MetricInputDTO struct {
	Impressions      *int64   `json:"impressions"`
	Clicks           *int64   `json:"clicks"`
	Spend            *float64 `json:"spend"`
	Currency         *string  `json:"currency"`
	CTR              *float64 `json:"ctr"`
	CPC              *float64 `json:"cpc"`
	Conversions      *float64 `json:"conversions"`
	ConversionValue  *float64 `json:"conversion_value"`
	ROAS             *float64 `json:"roas"`
	VideoViews       *int64   `json:"video_views"`
	VideoViewRate    *float64 `json:"video_view_rate"`
	CostPerVideoView *float64 `json:"cost_per_video_view"`
}
type SyncMetricsResponse struct {
	MetricsSnapshot domain.AdMetricsSnapshot `json:"metrics_snapshot"`
}
