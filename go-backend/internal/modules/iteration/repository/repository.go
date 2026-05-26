package repository

import (
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/modules/iteration/dto"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type Repository struct{ db *sqlx.DB }

func New(db *sqlx.DB) *Repository { return &Repository{db: db} }

func (r *Repository) Create(ctx domain.TenantContext, req dto.CreateIterationSuggestionRequest) (domain.CreativeIterationSuggestion, error) {
	id := uuid.NewString()
	var created time.Time
	changes := demoOrMockSuggestedChanges()
	err := r.db.QueryRowx(`INSERT INTO creative_iteration_suggestions (id, tenant_id, project_id, suggestion_type, reason, suggested_value, priority, status) VALUES ($1,$2,$3,'creative_change',$4,$5,'medium','pending') RETURNING created_at`, id, ctx.TenantID, req.ProjectID, req.Reason, demoOrMockSuggestedValue(changes)).Scan(&created)
	return domain.CreativeIterationSuggestion{ID: id, TenantID: ctx.TenantID, ProjectID: req.ProjectID, GeneratedVideoID: req.GeneratedVideoID, AdMetricsSnapshotID: req.AdMetricsSnapshotID, Reason: req.Reason, SuggestedChanges: changes, Confidence: "medium", Status: "suggested", CreatedAt: created}, err
}
