package repository

import (
	"database/sql"
	"encoding/json"

	"github.com/M1ralai/Kastonom/backend/internal/modules/creative/dto"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

type CreativeProjectRepository interface {
	CreateBundle(project domain.CreativeProject, subject domain.CreativeSubject, assets []domain.SourceAsset) (domain.CreativeProjectBundle, error)
	ListBundles(tenantID string) ([]domain.CreativeProjectBundle, error)
	GetBundle(tenantID string, projectID string) (*domain.CreativeProjectBundle, bool, error)
	SaveUnattachedAsset(asset domain.SourceAsset) (domain.SourceAsset, error)
	GetProjectMetrics(tenantID string, projectID string) (dto.ProjectMetricsResponse, bool, error)
}

type Repository struct{ db *sqlx.DB }

func New(db *sqlx.DB) *Repository { return &Repository{db: db} }

func (r *Repository) CreateBundle(project domain.CreativeProject, subject domain.CreativeSubject, assets []domain.SourceAsset) (domain.CreativeProjectBundle, error) {
	tx, err := r.db.Beginx()
	if err != nil {
		return domain.CreativeProjectBundle{}, err
	}
	defer tx.Rollback()
	err = tx.QueryRowx(`INSERT INTO creative_projects (id, tenant_id, name, status) VALUES ($1,$2,$3,$4) RETURNING created_at, updated_at`, project.ID, project.TenantID, project.Name, project.Status).Scan(&project.CreatedAt, &project.UpdatedAt)
	if err != nil {
		return domain.CreativeProjectBundle{}, err
	}
	err = tx.QueryRowx(`
		INSERT INTO creative_subjects (id, tenant_id, project_id, subject_type, name, description, landing_url, price, currency, allowed_claims, forbidden_claims, unknown_fields, source)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		RETURNING created_at, updated_at
	`, subject.ID, subject.TenantID, subject.ProjectID, subject.SubjectType, subject.Name, subject.Description, subject.LandingURL, subject.Price, subject.Currency, pq.Array(subject.AllowedClaims), pq.Array(subject.ForbiddenClaims), pq.Array(subject.UnknownFields), subject.Source).Scan(&subject.CreatedAt, &subject.UpdatedAt)
	if err != nil {
		return domain.CreativeProjectBundle{}, err
	}
	for i := range assets {
		metadata, _ := json.Marshal(assets[i].Metadata)
		err = tx.QueryRowx(`
			INSERT INTO source_assets (id, tenant_id, project_id, asset_type, source, url, metadata)
			VALUES ($1,$2,$3,$4,$5,$6,$7)
			RETURNING created_at
		`, assets[i].ID, assets[i].TenantID, assets[i].ProjectID, assets[i].AssetType, assets[i].Source, assets[i].URL, metadata).Scan(&assets[i].CreatedAt)
		if err != nil {
			return domain.CreativeProjectBundle{}, err
		}
	}
	if err := tx.Commit(); err != nil {
		return domain.CreativeProjectBundle{}, err
	}
	return domain.CreativeProjectBundle{CreativeProject: project, CreativeSubject: &subject, SourceAssets: assets}, nil
}

func (r *Repository) ListBundles(tenantID string) ([]domain.CreativeProjectBundle, error) {
	var projects []domain.CreativeProject
	err := r.db.Select(&projects, `SELECT id, tenant_id AS tenantid, name, status, selected_generated_video_id AS selectedgeneratedvideoid, latest_generation_request_id AS latestgenerationrequestid, created_at AS createdat, updated_at AS updatedat FROM creative_projects WHERE tenant_id=$1 ORDER BY created_at DESC`, tenantID)
	if err != nil {
		return nil, err
	}
	bundles := make([]domain.CreativeProjectBundle, 0, len(projects))
	for _, project := range projects {
		bundle, _, err := r.GetBundle(tenantID, project.ID)
		if err != nil {
			return nil, err
		}
		if bundle != nil {
			bundles = append(bundles, *bundle)
		}
	}
	return bundles, nil
}

func (r *Repository) GetBundle(tenantID string, projectID string) (*domain.CreativeProjectBundle, bool, error) {
	var project domain.CreativeProject
	err := r.db.Get(&project, `SELECT id, tenant_id AS tenantid, name, status, selected_generated_video_id AS selectedgeneratedvideoid, latest_generation_request_id AS latestgenerationrequestid, created_at AS createdat, updated_at AS updatedat FROM creative_projects WHERE tenant_id=$1 AND id=$2`, tenantID, projectID)
	if err == sql.ErrNoRows {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	subject, _ := r.getSubject(tenantID, projectID)
	assets, err := r.listAssets(tenantID, projectID)
	if err != nil {
		return nil, false, err
	}
	requests := []domain.GenerationRequest{}
	_ = r.db.Select(&requests, `SELECT id, tenant_id AS tenantid, project_id AS projectid, creative_subject_id AS creativesubjectid, source_asset_ids AS sourceassetids, status, objective, target_audience AS targetaudience, platform, language, tone, style, call_to_action AS calltoaction, duration_seconds AS durationseconds, aspect_ratio AS aspectratio, user_notes AS usernotes, fallback_notes AS fallbacknotes, created_at AS createdat, updated_at AS updatedat FROM generation_requests WHERE tenant_id=$1 AND project_id=$2`, tenantID, projectID)
	videos := []domain.GeneratedVideo{}
	_ = r.db.Select(&videos, `SELECT id, tenant_id AS tenantid, project_id AS projectid, generation_request_id AS generationrequestid, video_job_id AS videojobid, provider_result_id AS providerresultid, url, thumbnail_url AS thumbnailurl, duration_seconds AS durationseconds, aspect_ratio AS aspectratio, status, is_selected AS isselected, is_mock AS ismock, created_at AS createdat, selected_at AS selectedat FROM generated_videos WHERE tenant_id=$1 AND project_id=$2`, tenantID, projectID)
	return &domain.CreativeProjectBundle{CreativeProject: project, CreativeSubject: subject, SourceAssets: assets, GenerationRequests: requests, GeneratedVideos: videos}, true, nil
}

func (r *Repository) SaveUnattachedAsset(asset domain.SourceAsset) (domain.SourceAsset, error) {
	metadata, _ := json.Marshal(asset.Metadata)
	err := r.db.QueryRowx(`INSERT INTO source_assets (id, tenant_id, asset_type, source, url, metadata) VALUES ($1,$2,$3,$4,$5,$6) RETURNING created_at`, asset.ID, asset.TenantID, asset.AssetType, asset.Source, asset.URL, metadata).Scan(&asset.CreatedAt)
	return asset, err
}

func (r *Repository) GetProjectMetrics(tenantID string, projectID string) (dto.ProjectMetricsResponse, bool, error) {
	subject, ok := r.getSubject(tenantID, projectID)
	if !ok {
		return dto.ProjectMetricsResponse{}, false, nil
	}
	return demoOrMockProjectMetrics(projectID, *subject), true, nil
}

func (r *Repository) getSubject(tenantID, projectID string) (*domain.CreativeSubject, bool) {
	var s domain.CreativeSubject
	err := r.db.QueryRowx(`
		SELECT id, tenant_id, project_id, subject_type, name, description, landing_url, price, currency, allowed_claims, forbidden_claims, unknown_fields, source, created_at, updated_at
		FROM creative_subjects WHERE tenant_id=$1 AND project_id=$2 LIMIT 1
	`, tenantID, projectID).Scan(&s.ID, &s.TenantID, &s.ProjectID, &s.SubjectType, &s.Name, &s.Description, &s.LandingURL, &s.Price, &s.Currency, pq.Array(&s.AllowedClaims), pq.Array(&s.ForbiddenClaims), pq.Array(&s.UnknownFields), &s.Source, &s.CreatedAt, &s.UpdatedAt)
	return &s, err == nil
}

func (r *Repository) listAssets(tenantID, projectID string) ([]domain.SourceAsset, error) {
	rows, err := r.db.Queryx(`SELECT id, tenant_id, project_id, asset_type, source, url, storage_key, mime_type, width, height, duration_seconds, checksum, COALESCE(metadata, '{}'::jsonb), created_at FROM source_assets WHERE tenant_id=$1 AND project_id=$2`, tenantID, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	assets := []domain.SourceAsset{}
	for rows.Next() {
		var a domain.SourceAsset
		var metadata []byte
		if err := rows.Scan(&a.ID, &a.TenantID, &a.ProjectID, &a.AssetType, &a.Source, &a.URL, &a.StorageKey, &a.MimeType, &a.Width, &a.Height, &a.DurationSeconds, &a.Checksum, &metadata, &a.CreatedAt); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(metadata, &a.Metadata)
		if a.Metadata == nil {
			a.Metadata = map[string]any{}
		}
		assets = append(assets, a)
	}
	return assets, rows.Err()
}

func NewID() string { return uuid.NewString() }
