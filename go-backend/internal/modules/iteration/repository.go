package iteration

import (
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/store"
)

type Repository struct{ store *store.Store }

func NewRepository(s *store.Store) *Repository { return &Repository{store: s} }
func (r *Repository) Create(ctx domain.TenantContext, req CreateIterationSuggestionRequest) domain.CreativeIterationSuggestion {
	suggestion := domain.CreativeIterationSuggestion{ID: store.NewID(), TenantID: ctx.TenantID, ProjectID: req.ProjectID, GeneratedVideoID: req.GeneratedVideoID, AdMetricsSnapshotID: req.AdMetricsSnapshotID, Reason: req.Reason, SuggestedChanges: []string{"shorten opening hook", "make call to action clearer"}, Confidence: "medium", Status: "suggested", CreatedAt: time.Now().UTC()}
	_ = r.store.Write(func() error { r.store.Suggestions[suggestion.ID] = suggestion; return nil })
	return suggestion
}
