package repository

import (
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/modules/dashboard/dto"
	"github.com/jmoiron/sqlx"
)

type DashboardReadRepository interface {
	GetKpiSummary(tenantID string) (dto.KpiSummaryResponse, error)
	GetRecentActivities(tenantID string, limit int) (dto.RecentActivitiesResponse, error)
}

type Repository struct{ db *sqlx.DB }

func New(db *sqlx.DB) *Repository { return &Repository{db: db} }

func (r *Repository) GetKpiSummary(tenantID string) (dto.KpiSummaryResponse, error) {
	var count int
	if err := r.db.Get(&count, `SELECT COUNT(*) FROM generated_videos WHERE tenant_id=$1 AND created_at >= date_trunc('month', now())`, tenantID); err != nil {
		return dto.KpiSummaryResponse{}, err
	}
	return demoOrMockKpiSummary(count), nil
}

func (r *Repository) GetRecentActivities(tenantID string, limit int) (dto.RecentActivitiesResponse, error) {
	if limit <= 0 {
		limit = 10
	}
	rows, err := r.db.Queryx(`SELECT id, name, status, updated_at FROM creative_projects WHERE tenant_id=$1 ORDER BY updated_at DESC LIMIT $2`, tenantID, limit)
	if err != nil {
		return dto.RecentActivitiesResponse{}, err
	}
	defer rows.Close()
	res := dto.RecentActivitiesResponse{Activities: []dto.RecentActivityDTO{}}
	for rows.Next() {
		var id, name, status string
		var updatedAt time.Time
		if err := rows.Scan(&id, &name, &status, &updatedAt); err != nil {
			return dto.RecentActivitiesResponse{}, err
		}
		res.Activities = append(res.Activities, dto.RecentActivityDTO{ID: id, ProjectID: id, ProjectName: name, Status: status, Icon: "video", UpdatedAt: updatedAt.Format(time.RFC3339)})
	}
	return res, rows.Err()
}
