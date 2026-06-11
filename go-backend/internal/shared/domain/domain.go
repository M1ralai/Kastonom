package domain

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type TenantContext struct {
	RequestID       string
	TenantID        string
	Mode            string
	FallbackEnabled bool
	IsDemoTenant    bool
	UserID          *string
}

type ReadinessStatus struct {
	Ready   bool     `json:"ready"`
	Mode    string   `json:"mode,omitempty"`
	IsMock  bool     `json:"is_mock,omitempty"`
	Missing []string `json:"missing,omitempty"`
	Error   string   `json:"error,omitempty"`
}

type AppConfig struct {
	Version                string
	Mode                   string
	FallbackEnabled        bool
	DemoTenantID           string
	DefaultVideoProvider   string
	DefaultLanguage        string
	DefaultPlatform        string
	DefaultDurationSeconds int
	DefaultAspectRatio     string
	PublicBaseURL          string
	MockPreviewURL         string
	// Pollo core provider (unified video generation entry per docs.pollo.ai).
	PolloAPIKey        string
	PolloBaseURL       string
	PolloTimeoutMs     int
	PolloWebhookSecret string
	// Kling direct provider (Pollo routes through this for some models).
	KlingAPIKey  string
	KlingBaseURL string
	// Meta Ads reachability (read by the health probe). Adding these does
	// NOT change the public AppConfig surface; they are read by internal/
	// shared/health.Probe at /health time. Existing fields are preserved.
	MetaAdsBaseURL     string
	MetaAdsAccountID   string
	MetaAdsAccessToken string
	// Google Ads reachability (read by the health probe).
	GoogleAdsBaseURL        string
	GoogleAdsAccountID      string
	GoogleAdsDeveloperToken string
	// UploadDir is the on-disk directory served at GET /uploads/* by
	// bootstrap.NewApp. Default "./uploads". Override via UPLOAD_DIR.
	UploadDir string
}

func DefaultConfig() AppConfig {
	return AppConfig{
		Version:                 envString("KASTONOM_VERSION", "0.1.0-go"),
		Mode:                    envString("KASTONOM_MODE", "mock"),
		FallbackEnabled:         envBool("KASTONOM_FALLBACK_ENABLED", true),
		DemoTenantID:            envString("KASTONOM_DEMO_TENANT_ID", "demo-tenant"),
		DefaultVideoProvider:    envString("KASTONOM_DEFAULT_VIDEO_PROVIDER", "mock"),
		DefaultLanguage:         envString("KASTONOM_DEFAULT_LANGUAGE", "tr"),
		DefaultPlatform:         envString("KASTONOM_DEFAULT_PLATFORM", "reels"),
		DefaultDurationSeconds:  envInt("KASTONOM_DEFAULT_DURATION_SECONDS", 15),
		DefaultAspectRatio:      envString("KASTONOM_DEFAULT_ASPECT_RATIO", "9:16"),
		PublicBaseURL:           envString("KASTONOM_PUBLIC_BASE_URL", "http://localhost:3001"),
		MockPreviewURL:          envString("KASTONOM_MOCK_PREVIEW_URL", "/demo-assets/mock-ad-preview.mp4"),
		PolloAPIKey:             envString("POLLO_API_KEY", ""),
		PolloBaseURL:            envString("POLLO_API_BASE_URL", "https://pollo.ai"),
		PolloTimeoutMs:          envInt("POLLO_TIMEOUT_MS", 30000),
		PolloWebhookSecret:      envString("POLLO_WEBHOOK_SECRET", ""),
		KlingAPIKey:             envString("KLING_API_KEY", ""),
		KlingBaseURL:            envString("KLING_API_BASE_URL", ""),
		MetaAdsBaseURL:          envString("META_ADS_BASE_URL", "https://graph.facebook.com"),
		MetaAdsAccountID:        envString("META_ADS_ACCOUNT_ID", ""),
		MetaAdsAccessToken:      envString("META_ADS_ACCESS_TOKEN", ""),
		GoogleAdsBaseURL:        envString("GOOGLE_ADS_BASE_URL", "https://googleads.googleapis.com"),
		GoogleAdsAccountID:      envString("GOOGLE_ADS_ACCOUNT_ID", ""),
		GoogleAdsDeveloperToken: envString("GOOGLE_ADS_DEVELOPER_TOKEN", ""),
		UploadDir:               envString("UPLOAD_DIR", "./uploads"),
	}
}

func envString(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func envBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func envInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

type Tenant struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Mode      string    `json:"mode"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type TenantCredits struct {
	TenantID         string `json:"tenant_id"`
	CurrentCredits   int    `json:"current_credits"`
	CreditCurrency   string `json:"credit_currency"`
	MonthlyAllowance int    `json:"monthly_allowance"`
	UsedThisMonth    int    `json:"used_this_month"`
	VideosPerCredit  int    `json:"videos_per_credit"`
}

type User struct {
	ID           string    `json:"id"`
	TenantID     string    `json:"tenant_id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Name         string    `json:"name"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type CreativeProject struct {
	ID                        string    `json:"id"`
	TenantID                  string    `json:"tenant_id"`
	Name                      string    `json:"name"`
	Status                    string    `json:"status"`
	SelectedGeneratedVideoID  *string   `json:"selected_generated_video_id"`
	LatestGenerationRequestID *string   `json:"latest_generation_request_id"`
	CreatedAt                 time.Time `json:"created_at"`
	UpdatedAt                 time.Time `json:"updated_at"`
}

type CreativeSubject struct {
	ID              string    `json:"id"`
	TenantID        string    `json:"tenant_id"`
	ProjectID       string    `json:"project_id"`
	SubjectType     string    `json:"subject_type"`
	Name            string    `json:"name"`
	Description     *string   `json:"description"`
	LandingURL      *string   `json:"landing_url"`
	Price           *float64  `json:"price"`
	Currency        *string   `json:"currency"`
	AllowedClaims   []string  `json:"allowed_claims"`
	ForbiddenClaims []string  `json:"forbidden_claims"`
	UnknownFields   []string  `json:"unknown_fields"`
	Source          string    `json:"source"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type SourceAsset struct {
	ID              string         `json:"id"`
	TenantID        string         `json:"tenant_id"`
	ProjectID       *string        `json:"project_id"`
	AssetType       string         `json:"asset_type"`
	Source          string         `json:"source"`
	URL             string         `json:"url"`
	StorageKey      *string        `json:"storage_key"`
	MimeType        *string        `json:"mime_type"`
	Width           *int           `json:"width"`
	Height          *int           `json:"height"`
	DurationSeconds *float64       `json:"duration_seconds"`
	Checksum        *string        `json:"checksum"`
	Metadata        map[string]any `json:"metadata"`
	CreatedAt       time.Time      `json:"created_at"`
}

type CreativeProjectBundle struct {
	CreativeProject    CreativeProject     `json:"creative_project"`
	CreativeSubject    *CreativeSubject    `json:"creative_subject"`
	SourceAssets       []SourceAsset       `json:"source_assets"`
	GenerationRequests []GenerationRequest `json:"generation_requests,omitempty"`
	GeneratedVideos    []GeneratedVideo    `json:"generated_videos,omitempty"`
}

type GenerationRequest struct {
	ID                string    `json:"id"`
	TenantID          string    `json:"tenant_id"`
	ProjectID         string    `json:"project_id"`
	CreativeSubjectID string    `json:"creative_subject_id"`
	SourceAssetIDs    []string  `json:"source_asset_ids"`
	Status            string    `json:"status"`
	Objective         string    `json:"objective"`
	TargetAudience    *string   `json:"target_audience"`
	Platform          string    `json:"platform"`
	Language          string    `json:"language"`
	Tone              *string   `json:"tone"`
	Style             *string   `json:"style"`
	CallToAction      *string   `json:"call_to_action"`
	DurationSeconds   int       `json:"duration_seconds"`
	AspectRatio       string    `json:"aspect_ratio"`
	UserNotes         *string   `json:"user_notes"`
	FallbackNotes     []string  `json:"fallback_notes"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type PromptPayload struct {
	ID                  string         `json:"id"`
	TenantID            string         `json:"tenant_id"`
	ProjectID           string         `json:"project_id"`
	GenerationRequestID string         `json:"generation_request_id"`
	Provider            string         `json:"provider"`
	PromptText          string         `json:"prompt_text"`
	NegativePrompt      string         `json:"negative_prompt"`
	Language            string         `json:"language"`
	DurationSeconds     int            `json:"duration_seconds"`
	AspectRatio         string         `json:"aspect_ratio"`
	SourceAssetIDs      []string       `json:"source_asset_ids"`
	ProviderOptions     map[string]any `json:"provider_options"`
	IsMock              bool           `json:"is_mock"`
	FallbackNotes       []string       `json:"fallback_notes"`
	CreatedAt           time.Time      `json:"created_at"`
}

type ProviderResult struct {
	ID               string         `json:"id"`
	TenantID         string         `json:"tenant_id"`
	VideoJobID       string         `json:"video_job_id"`
	Provider         string         `json:"provider"`
	ProviderJobID    *string        `json:"provider_job_id"`
	RawStatus        *string        `json:"raw_status"`
	NormalizedStatus string         `json:"normalized_status"`
	ResultURLs       []string       `json:"result_urls"`
	ErrorCode        *string        `json:"error_code"`
	ErrorMessage     *string        `json:"error_message"`
	RedactedMetadata map[string]any `json:"redacted_metadata"`
	ReceivedAt       time.Time      `json:"received_at"`
}

type VideoJob struct {
	ID                  string     `json:"id"`
	TenantID            string     `json:"tenant_id"`
	ProjectID           string     `json:"project_id"`
	GenerationRequestID string     `json:"generation_request_id"`
	PromptPayloadID     string     `json:"prompt_payload_id"`
	Provider            string     `json:"provider"`
	Status              string     `json:"status"`
	ProviderJobID       *string    `json:"provider_job_id"`
	IsMock              bool       `json:"is_mock"`
	FallbackReason      *string    `json:"fallback_reason"`
	ErrorCode           *string    `json:"error_code"`
	ErrorMessage        *string    `json:"error_message"`
	AttemptCount        int        `json:"attempt_count"`
	CreatedAt           time.Time  `json:"created_at"`
	SubmittedAt         *time.Time `json:"submitted_at"`
	CompletedAt         *time.Time `json:"completed_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

type GeneratedVideo struct {
	ID                  string     `json:"id"`
	TenantID            string     `json:"tenant_id"`
	ProjectID           string     `json:"project_id"`
	GenerationRequestID string     `json:"generation_request_id"`
	VideoJobID          string     `json:"video_job_id"`
	ProviderResultID    *string    `json:"provider_result_id"`
	URL                 string     `json:"url"`
	ThumbnailURL        *string    `json:"thumbnail_url"`
	DurationSeconds     *int       `json:"duration_seconds"`
	AspectRatio         string     `json:"aspect_ratio"`
	Status              string     `json:"status"`
	IsSelected          bool       `json:"is_selected"`
	IsMock              bool       `json:"is_mock"`
	CreatedAt           time.Time  `json:"created_at"`
	SelectedAt          *time.Time `json:"selected_at"`
}

type AdPublication struct {
	ID                     string     `json:"id"`
	TenantID               string     `json:"tenant_id"`
	ProjectID              string     `json:"project_id"`
	GeneratedVideoID       string     `json:"generated_video_id"`
	AdPlatformConnectionID *string    `json:"ad_platform_connection_id"`
	Platform               string     `json:"platform"`
	Status                 string     `json:"status"`
	ExternalCampaignID     *string    `json:"external_campaign_id"`
	ExternalAdGroupID      *string    `json:"external_ad_group_id"`
	ExternalAdID           *string    `json:"external_ad_id"`
	DestinationURL         *string    `json:"destination_url"`
	PublishedAt            *time.Time `json:"published_at"`
	PausedAt               *time.Time `json:"paused_at"`
	ErrorCode              *string    `json:"error_code"`
	ErrorMessage           *string    `json:"error_message"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

type AdMetricsSnapshot struct {
	ID               string         `json:"id"`
	TenantID         string         `json:"tenant_id"`
	AdPublicationID  string         `json:"ad_publication_id"`
	Platform         string         `json:"platform"`
	DateStart        string         `json:"date_start"`
	DateEnd          string         `json:"date_end"`
	Impressions      *int64         `json:"impressions"`
	Clicks           *int64         `json:"clicks"`
	Spend            *float64       `json:"spend"`
	Currency         *string        `json:"currency"`
	CTR              *float64       `json:"ctr"`
	CPC              *float64       `json:"cpc"`
	Conversions      *float64       `json:"conversions"`
	ConversionValue  *float64       `json:"conversion_value"`
	ROAS             *float64       `json:"roas"`
	VideoViews       *int64         `json:"video_views"`
	VideoViewRate    *float64       `json:"video_view_rate"`
	CostPerVideoView *float64       `json:"cost_per_video_view"`
	Source           string         `json:"source"`
	RedactedMetadata map[string]any `json:"redacted_metadata"`
	FetchedAt        time.Time      `json:"fetched_at"`
}

type CreativeIterationSuggestion struct {
	ID                  string    `json:"id"`
	TenantID            string    `json:"tenant_id"`
	ProjectID           string    `json:"project_id"`
	GeneratedVideoID    string    `json:"generated_video_id"`
	AdMetricsSnapshotID *string   `json:"ad_metrics_snapshot_id"`
	Reason              string    `json:"reason"`
	SuggestedChanges    []string  `json:"suggested_changes"`
	Confidence          string    `json:"confidence"`
	Status              string    `json:"status"`
	CreatedAt           time.Time `json:"created_at"`
}
