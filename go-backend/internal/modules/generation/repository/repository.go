package repository

import (
	"database/sql"
	"encoding/json"

	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

type Repository struct{ db *sqlx.DB }

func New(db *sqlx.DB) *Repository { return &Repository{db: db} }
func NewID() string               { return uuid.NewString() }

func (r *Repository) ProjectInput(tenantID, projectID string) (domain.CreativeProject, *domain.CreativeSubject, bool, error) {
	var project domain.CreativeProject
	err := r.db.Get(&project, `SELECT id, tenant_id AS tenantid, name, status, selected_generated_video_id AS selectedgeneratedvideoid, latest_generation_request_id AS latestgenerationrequestid, created_at AS createdat, updated_at AS updatedat FROM creative_projects WHERE tenant_id=$1 AND id=$2`, tenantID, projectID)
	if err == sql.ErrNoRows {
		return domain.CreativeProject{}, nil, false, nil
	}
	if err != nil {
		return domain.CreativeProject{}, nil, false, err
	}
	var subject domain.CreativeSubject
	err = r.db.QueryRowx(`SELECT id, tenant_id, project_id, subject_type, name, description, landing_url, price, currency, allowed_claims, forbidden_claims, unknown_fields, source, created_at, updated_at FROM creative_subjects WHERE tenant_id=$1 AND project_id=$2 LIMIT 1`, tenantID, projectID).Scan(&subject.ID, &subject.TenantID, &subject.ProjectID, &subject.SubjectType, &subject.Name, &subject.Description, &subject.LandingURL, &subject.Price, &subject.Currency, pq.Array(&subject.AllowedClaims), pq.Array(&subject.ForbiddenClaims), pq.Array(&subject.UnknownFields), &subject.Source, &subject.CreatedAt, &subject.UpdatedAt)
	if err == sql.ErrNoRows {
		return project, nil, false, nil
	}
	return project, &subject, err == nil, err
}

func (r *Repository) Create(req domain.GenerationRequest, payload domain.PromptPayload, job domain.VideoJob, result domain.ProviderResult, videos []domain.GeneratedVideo) error {
	tx, err := r.db.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	err = tx.QueryRowx(`INSERT INTO generation_requests (id, tenant_id, project_id, creative_subject_id, status, objective, target_audience, platform, language, tone, style, call_to_action, duration_seconds, aspect_ratio, user_notes, fallback_notes, source_asset_ids) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING created_at, updated_at`, req.ID, req.TenantID, req.ProjectID, req.CreativeSubjectID, req.Status, req.Objective, req.TargetAudience, req.Platform, req.Language, req.Tone, req.Style, req.CallToAction, req.DurationSeconds, req.AspectRatio, req.UserNotes, pq.Array(req.FallbackNotes), pq.Array(req.SourceAssetIDs)).Scan(&req.CreatedAt, &req.UpdatedAt)
	if err != nil {
		return err
	}
	opts, _ := json.Marshal(payload.ProviderOptions)
	err = tx.QueryRowx(`INSERT INTO prompt_payloads (id, tenant_id, project_id, generation_request_id, provider, prompt_text, negative_prompt, language, duration_seconds, aspect_ratio, source_asset_ids, provider_options, is_mock, fallback_notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING created_at`, payload.ID, payload.TenantID, payload.ProjectID, payload.GenerationRequestID, payload.Provider, payload.PromptText, payload.NegativePrompt, payload.Language, payload.DurationSeconds, payload.AspectRatio, pq.Array(payload.SourceAssetIDs), opts, payload.IsMock, pq.Array(payload.FallbackNotes)).Scan(&payload.CreatedAt)
	if err != nil {
		return err
	}
	err = tx.QueryRowx(`INSERT INTO video_jobs (id, tenant_id, project_id, generation_request_id, prompt_payload_id, provider, status, provider_job_id, is_mock, fallback_reason, error_code, error_message, attempt_count, completed_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING created_at, updated_at`, job.ID, job.TenantID, job.ProjectID, job.GenerationRequestID, job.PromptPayloadID, job.Provider, job.Status, job.ProviderJobID, job.IsMock, job.FallbackReason, job.ErrorCode, job.ErrorMessage, job.AttemptCount, job.CompletedAt).Scan(&job.CreatedAt, &job.UpdatedAt)
	if err != nil {
		return err
	}
	meta, _ := json.Marshal(result.RedactedMetadata)
	err = tx.QueryRowx(`INSERT INTO provider_results (id, tenant_id, video_job_id, provider, provider_job_id, raw_status, normalized_status, result_urls, error_code, error_message, redacted_metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING received_at`, result.ID, result.TenantID, result.VideoJobID, result.Provider, result.ProviderJobID, result.RawStatus, result.NormalizedStatus, pq.Array(result.ResultURLs), result.ErrorCode, result.ErrorMessage, meta).Scan(&result.ReceivedAt)
	if err != nil {
		return err
	}
	for _, video := range videos {
		_, err = tx.Exec(`INSERT INTO generated_videos (id, tenant_id, project_id, generation_request_id, video_job_id, provider_result_id, url, thumbnail_url, duration_seconds, aspect_ratio, status, is_selected, is_mock) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, video.ID, video.TenantID, video.ProjectID, video.GenerationRequestID, video.VideoJobID, video.ProviderResultID, video.URL, video.ThumbnailURL, video.DurationSeconds, video.AspectRatio, video.Status, video.IsSelected, video.IsMock)
		if err != nil {
			return err
		}
	}
	_, err = tx.Exec(`UPDATE creative_projects SET status='ready', latest_generation_request_id=$1 WHERE tenant_id=$2 AND id=$3`, req.ID, req.TenantID, req.ProjectID)
	if err != nil {
		return err
	}
	return tx.Commit()
}
