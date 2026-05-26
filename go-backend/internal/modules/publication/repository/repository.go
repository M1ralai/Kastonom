package repository

import (
	"database/sql"

	"github.com/M1ralai/Kastonom/backend/internal/modules/publication/dto"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type Repository struct{ db *sqlx.DB }

func New(db *sqlx.DB) *Repository { return &Repository{db: db} }

func (r *Repository) CreatePublication(ctx domain.TenantContext, req dto.CreateAdPublicationRequest) (domain.AdPublication, bool, error) {
	var pub domain.AdPublication
	err := r.db.Get(&pub, `INSERT INTO ad_publications (id, tenant_id, project_id, generated_video_id, ad_platform_connection_id, platform, status, destination_url, published_at) VALUES ($1,$2,$3,$4,$5,$6,'published',$7,now()) RETURNING id, tenant_id AS tenantid, project_id AS projectid, generated_video_id AS generatedvideoid, ad_platform_connection_id AS adplatformconnectionid, platform, status, external_campaign_id AS externalcampaignid, external_ad_group_id AS externaladgroupid, external_ad_id AS externaladid, destination_url AS destinationurl, published_at AS publishedat, paused_at AS pausedat, error_code AS errorcode, error_message AS errormessage, created_at AS createdat, updated_at AS updatedat`, uuid.NewString(), ctx.TenantID, req.ProjectID, req.GeneratedVideoID, req.AdPlatformConnectionID, req.Platform, req.DestinationURL)
	if err != nil {
		return domain.AdPublication{}, false, err
	}
	_, _ = r.db.Exec(`UPDATE creative_projects SET status='published' WHERE tenant_id=$1 AND id=$2`, ctx.TenantID, req.ProjectID)
	_, _ = r.db.Exec(`UPDATE generated_videos SET status='published' WHERE tenant_id=$1 AND id=$2`, ctx.TenantID, req.GeneratedVideoID)
	return pub, true, nil
}

func (r *Repository) CreateMetrics(ctx domain.TenantContext, publicationID string, req dto.SyncMetricsRequest) (domain.AdMetricsSnapshot, bool, error) {
	var platform string
	err := r.db.Get(&platform, `SELECT platform FROM ad_publications WHERE tenant_id=$1 AND id=$2`, ctx.TenantID, publicationID)
	if err == sql.ErrNoRows {
		return domain.AdMetricsSnapshot{}, false, nil
	}
	if err != nil {
		return domain.AdMetricsSnapshot{}, false, err
	}
	m := dto.MetricInputDTO{}
	if req.Metrics != nil {
		m = *req.Metrics
	}
	var snap domain.AdMetricsSnapshot
	err = r.db.Get(&snap, `INSERT INTO ad_metrics_snapshots (id, tenant_id, ad_publication_id, platform, date_start, date_end, impressions, clicks, spend, currency, ctr, cpc, conversions, conversion_value, roas, video_views, video_view_rate, cost_per_video_view, source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id, tenant_id AS tenantid, ad_publication_id AS adpublicationid, platform, date_start AS datestart, date_end AS dateend, impressions, clicks, spend, currency, ctr, cpc, conversions, conversion_value AS conversionvalue, roas, video_views AS videoviews, video_view_rate AS videoviewrate, cost_per_video_view AS costpervideoview, source, redacted_metadata AS redactedmetadata, fetched_at AS fetchedat`, uuid.NewString(), ctx.TenantID, publicationID, platform, req.DateStart, req.DateEnd, m.Impressions, m.Clicks, m.Spend, m.Currency, m.CTR, m.CPC, m.Conversions, m.ConversionValue, m.ROAS, m.VideoViews, m.VideoViewRate, m.CostPerVideoView, req.Source)
	return snap, err == nil, err
}
