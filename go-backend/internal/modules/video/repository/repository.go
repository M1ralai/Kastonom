package repository

import (
	"database/sql"
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/modules/video/dto"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/jmoiron/sqlx"
)

type VideoJobReadRepository interface {
	GetJobView(tenantID, id string) (dto.VideoJobResponse, bool, error)
	GetFullView(tenantID, id string) (dto.FullVideoJobResponse, bool, error)
	SelectOne(tenantID, projectID, videoID string) (dto.SelectGeneratedVideoResponse, bool, error)
}

type Repository struct{ db *sqlx.DB }

func New(db *sqlx.DB) *Repository { return &Repository{db: db} }

func (r *Repository) GetJobView(tenantID, id string) (dto.VideoJobResponse, bool, error) {
	var job domain.VideoJob
	err := r.db.Get(&job, `SELECT id, tenant_id AS tenantid, project_id AS projectid, generation_request_id AS generationrequestid, prompt_payload_id AS promptpayloadid, provider, status, provider_job_id AS providerjobid, is_mock AS ismock, fallback_reason AS fallbackreason, error_code AS errorcode, error_message AS errormessage, attempt_count AS attemptcount, created_at AS createdat, submitted_at AS submittedat, completed_at AS completedat, updated_at AS updatedat FROM video_jobs WHERE tenant_id=$1 AND id=$2`, tenantID, id)
	if err == sql.ErrNoRows {
		return dto.VideoJobResponse{}, false, nil
	}
	if err != nil {
		return dto.VideoJobResponse{}, false, err
	}
	videos := []domain.GeneratedVideo{}
	if err := r.db.Select(&videos, `SELECT id, tenant_id AS tenantid, project_id AS projectid, generation_request_id AS generationrequestid, video_job_id AS videojobid, provider_result_id AS providerresultid, url, thumbnail_url AS thumbnailurl, duration_seconds AS durationseconds, aspect_ratio AS aspectratio, status, is_selected AS isselected, is_mock AS ismock, created_at AS createdat, selected_at AS selectedat FROM generated_videos WHERE tenant_id=$1 AND video_job_id=$2`, tenantID, id); err != nil {
		return dto.VideoJobResponse{}, false, err
	}
	return dto.VideoJobResponse{VideoJob: job, GeneratedVideos: videos, FallbackReason: job.FallbackReason}, true, nil
}

func (r *Repository) GetFullView(tenantID, id string) (dto.FullVideoJobResponse, bool, error) {
	view, ok, err := r.GetJobView(tenantID, id)
	if err != nil || !ok {
		return dto.FullVideoJobResponse{}, ok, err
	}
	res := dto.FullVideoJobResponse{VideoJob: dto.FullVideoJobDTO{ID: view.VideoJob.ID, Status: view.VideoJob.Status, Provider: view.VideoJob.Provider, IsMock: view.VideoJob.IsMock, FallbackReason: view.VideoJob.FallbackReason, CreatedAt: view.VideoJob.CreatedAt.Format(time.RFC3339)}}
	for _, v := range view.GeneratedVideos {
		res.GeneratedVideos = append(res.GeneratedVideos, dto.GeneratedVideoPreviewDTO{ID: v.ID, URL: v.URL, ThumbnailURL: v.ThumbnailURL, DurationSeconds: v.DurationSeconds, AspectRatio: v.AspectRatio, Status: v.Status, IsSelected: v.IsSelected})
	}
	_ = r.db.QueryRowx(`SELECT id, name FROM creative_projects WHERE tenant_id=$1 AND id=$2`, tenantID, view.VideoJob.ProjectID).Scan(&res.Project.ID, &res.Project.Name)
	return res, true, nil
}

func (r *Repository) SelectOne(tenantID, projectID, videoID string) (dto.SelectGeneratedVideoResponse, bool, error) {
	tx, err := r.db.Beginx()
	if err != nil {
		return dto.SelectGeneratedVideoResponse{}, false, err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`UPDATE generated_videos SET is_selected=false, status=CASE WHEN status='selected' THEN 'generated' ELSE status END WHERE tenant_id=$1 AND project_id=$2`, tenantID, projectID); err != nil {
		return dto.SelectGeneratedVideoResponse{}, false, err
	}
	var video domain.GeneratedVideo
	err = tx.Get(&video, `UPDATE generated_videos SET is_selected=true, status='selected', selected_at=now() WHERE tenant_id=$1 AND project_id=$2 AND id=$3 RETURNING id, tenant_id AS tenantid, project_id AS projectid, generation_request_id AS generationrequestid, video_job_id AS videojobid, provider_result_id AS providerresultid, url, thumbnail_url AS thumbnailurl, duration_seconds AS durationseconds, aspect_ratio AS aspectratio, status, is_selected AS isselected, is_mock AS ismock, created_at AS createdat, selected_at AS selectedat`, tenantID, projectID, videoID)
	if err == sql.ErrNoRows {
		return dto.SelectGeneratedVideoResponse{}, false, nil
	}
	if err != nil {
		return dto.SelectGeneratedVideoResponse{}, false, err
	}
	var project domain.CreativeProject
	err = tx.Get(&project, `UPDATE creative_projects SET selected_generated_video_id=$1, status='ready' WHERE tenant_id=$2 AND id=$3 RETURNING id, tenant_id AS tenantid, name, status, selected_generated_video_id AS selectedgeneratedvideoid, latest_generation_request_id AS latestgenerationrequestid, created_at AS createdat, updated_at AS updatedat`, videoID, tenantID, projectID)
	if err != nil {
		return dto.SelectGeneratedVideoResponse{}, false, err
	}
	return dto.SelectGeneratedVideoResponse{CreativeProject: project, GeneratedVideo: video}, true, tx.Commit()
}
