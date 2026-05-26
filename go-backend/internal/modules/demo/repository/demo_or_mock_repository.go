package repository

import (
	"github.com/M1ralai/Kastonom/backend/internal/modules/demo/dto"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/jmoiron/sqlx"
)

type DemoReplayRepository interface {
	GetReplay(tenantID string) (dto.DemoFallbackResponse, error)
}
type Repository struct{ db *sqlx.DB }

func New(db *sqlx.DB) *Repository { return &Repository{db: db} }
func (r *Repository) GetReplay(tenantID string) (dto.DemoFallbackResponse, error) {
	res := dto.DemoFallbackResponse{SourceAssets: []domain.SourceAsset{}, GeneratedVideos: []domain.GeneratedVideo{}, FallbackReason: "demo replay"}
	var project domain.CreativeProject
	err := r.db.Get(&project, `SELECT id, tenant_id AS tenantid, name, status, selected_generated_video_id AS selectedgeneratedvideoid, latest_generation_request_id AS latestgenerationrequestid, created_at AS createdat, updated_at AS updatedat FROM creative_projects WHERE tenant_id=$1 ORDER BY updated_at DESC LIMIT 1`, tenantID)
	if err != nil {
		return res, nil
	}
	res.CreativeProject = &project
	return res, nil
}
