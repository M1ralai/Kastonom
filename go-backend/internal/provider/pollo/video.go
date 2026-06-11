// Package pollo is the real Pollo AI provider client. It implements the
// minimum surface needed by generation/service to replace the demo-or-mock
// helpers with real HTTP calls.
//
// Endpoints used (per docs.pollo.ai):
//   - POST   /v1/videos              -> Create a video generation job.
//   - GET    /v1/videos/{id}         -> Poll job status / fetch result URLs.
//   - POST   /v1/videos/estimate     -> Estimate credit/USD cost.
//
// Webhook handling lives outside this package (cmd/api or a future
// modules/webhook handler) but signature verification helpers are provided
// here so the secret never leaves the provider package.
package pollo

// CreateVideoRequest is the JSON body sent to POST /v1/videos. The shape is
// speculative — see package doc and TODO(migration): regenerate from the real
// /openapi.json spec before relying on field names in production.
type CreateVideoRequest struct {
	Model           string   `json:"model"`
	Prompt          string   `json:"prompt"`
	NegativePrompt  string   `json:"negative_prompt,omitempty"`
	DurationSec     int      `json:"duration_seconds"`
	AspectRatio     string   `json:"aspect_ratio"`
	Platform        string   `json:"platform,omitempty"`
	Language        string   `json:"language,omitempty"`
	SourceAssetURLs []string `json:"source_asset_urls,omitempty"`
	// IdempotencyKey is sent as the Idempotency-Key header, not in the body.
	IdempotencyKey string `json:"-"`
}

// CreateVideoResponse is the expected shape of POST /v1/videos. We use a
// loose struct so that unknown fields don't break the call — the real spec
// may add or rename fields between minor versions.
type CreateVideoResponse struct {
	ProviderJobID string         `json:"provider_job_id"`
	ID            string         `json:"id"`
	Status        string         `json:"status"`
	EstimatedCost *EstimatedCost `json:"estimated_cost,omitempty"`
	Raw           map[string]any `json:"-"`
}

// GetVideoResponse is the expected shape of GET /v1/videos/{provider_job_id}.
type GetVideoResponse struct {
	ProviderJobID string   `json:"provider_job_id"`
	ID            string   `json:"id"`
	Status        string   `json:"status"`
	ResultURLs    []string `json:"result_urls"`
	ThumbnailURL  string   `json:"thumbnail_url,omitempty"`
	DurationSec   int      `json:"duration_seconds,omitempty"`
	ErrorCode     string   `json:"error_code,omitempty"`
	ErrorMessage  string   `json:"error_message,omitempty"`
}

// EstimateRequest is the JSON body sent to POST /v1/videos/estimate.
type EstimateRequest struct {
	Model       string `json:"model"`
	DurationSec int    `json:"duration_seconds"`
	AspectRatio string `json:"aspect_ratio"`
	Platform    string `json:"platform,omitempty"`
}

// EstimateResponse is the expected shape of POST /v1/videos/estimate.
type EstimateResponse struct {
	EstimatedCredits int           `json:"estimated_credits"`
	EstimatedCost    EstimatedCost `json:"estimated_cost"`
}

// EstimatedCost is a normalized (amount, currency) tuple shared between
// Create and Estimate responses. The currency is whatever the provider
// reports; the service layer normalizes to TRY for the API surface.
type EstimatedCost struct {
	Amount    float64 `json:"amount"`
	Currency  string  `json:"currency"`
	MaxAmount float64 `json:"max_amount,omitempty"`
}

// WebhookEvent is the inbound shape posted by Pollo to /v1/webhooks/video.
// We accept the minimum fields needed to advance a VideoJob from
// processing -> succeeded/failed. Additional fields are preserved in
// RedactedMetadata by the caller.
type WebhookEvent struct {
	EventType     string         `json:"event_type"`
	ProviderJobID string         `json:"provider_job_id"`
	Status        string         `json:"status"`
	ResultURLs    []string       `json:"result_urls,omitempty"`
	ThumbnailURL  string         `json:"thumbnail_url,omitempty"`
	ErrorCode     string         `json:"error_code,omitempty"`
	ErrorMessage  string         `json:"error_message,omitempty"`
	ReceivedAt    string         `json:"received_at,omitempty"`
	Extra         map[string]any `json:"-"`
}
