package creative

import "github.com/M1ralai/Kastonom/backend/internal/shared/domain"

type CreativeSubjectInput struct {
	SubjectType     string   `json:"subject_type"`
	Name            string   `json:"name"`
	Description     *string  `json:"description"`
	LandingURL      *string  `json:"landing_url"`
	Price           *float64 `json:"price"`
	Currency        *string  `json:"currency"`
	AllowedClaims   []string `json:"allowed_claims"`
	ForbiddenClaims []string `json:"forbidden_claims"`
	UnknownFields   []string `json:"unknown_fields"`
	Source          string   `json:"source"`
}

type SourceAssetInput struct {
	AssetType string         `json:"asset_type"`
	Source    string         `json:"source"`
	URL       string         `json:"url"`
	Metadata  map[string]any `json:"metadata"`
}

type CreateCreativeProjectRequest struct {
	Name            string               `json:"name"`
	CreativeSubject CreativeSubjectInput `json:"creative_subject"`
	SourceAssets    []SourceAssetInput   `json:"source_assets"`
}

type CreateCreativeProjectResponse struct {
	CreativeProject domain.CreativeProject `json:"creative_project"`
	CreativeSubject domain.CreativeSubject `json:"creative_subject"`
	SourceAssets    []domain.SourceAsset   `json:"source_assets"`
	FallbackReason  *string                `json:"fallback_reason"`
}

type CreativeProjectBundleResponse = domain.CreativeProjectBundle

type SourceAssetUploadResponse struct {
	SourceAsset domain.SourceAsset `json:"source_asset"`
	UploadURL   string             `json:"upload_url"`
}

type ProjectMetricsResponse struct {
	ProjectID       string                   `json:"project_id"`
	CreativeSubject ProjectMetricsSubjectDTO `json:"creative_subject"`
	ERPData         ERPDataDTO               `json:"erp_data"`
}

type ProjectMetricsSubjectDTO struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	Price         *float64 `json:"price"`
	Currency      *string  `json:"currency"`
	MarginPercent *int     `json:"margin_percent"`
	StockCount    *int     `json:"stock_count"`
	AIScore       int      `json:"ai_score"`
	AIReasons     []string `json:"ai_reasons"`
}

type ERPDataDTO struct {
	StockAvailable *int    `json:"stock_available"`
	StockReserved  *int    `json:"stock_reserved"`
	LastSyncAt     *string `json:"last_sync_at"`
}
