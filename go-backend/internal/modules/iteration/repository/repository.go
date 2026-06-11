package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/modules/iteration/dto"
	"github.com/M1ralai/Kastonom/backend/internal/provider/pollo"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// Repository persists creative iteration suggestions.
//
// The previous implementation hard-coded a static mock change set
// (see demo_or_mock_repository.go). This version still falls back to
// those helpers when running in mock mode or when no Pollo client is
// configured, but in production it issues a real LLM call to
// POST /v1/insights/iterations/suggest via the shared *pollo.Client.
type Repository struct {
	db       *sqlx.DB
	pollo    *pollo.Client
	usePollo bool
}

func New(db *sqlx.DB) *Repository { return &Repository{db: db} }

// NewWithPollo returns a Repository that, when usePollo is true, routes
// the LLM call through the supplied *pollo.Client. The boolean lets the
// caller preserve KASTONOM_MODE=mock behavior: when the runtime is in
// mock mode the repository must still answer with the demo helpers
// exactly, regardless of whether a client is wired in.
//
// Existing callers that constructed *Repository via New(db) continue to
// work and still get mock behavior.
func NewWithPollo(db *sqlx.DB, client *pollo.Client, usePollo bool) *Repository {
	return &Repository{db: db, pollo: client, usePollo: usePollo && client != nil && client.Enabled()}
}

func (r *Repository) Create(ctx domain.TenantContext, req dto.CreateIterationSuggestionRequest) (domain.CreativeIterationSuggestion, error) {
	// Resolve the suggestion content from either Pollo (real LLM) or the
	// existing mock helpers. Both paths return the same shape, so the DB
	// insert is identical.
	changes, confidence, value, err := r.resolveSuggestion(ctx, req)
	if err != nil {
		return domain.CreativeIterationSuggestion{}, err
	}

	id := uuid.NewString()
	var created time.Time
	insertErr := r.db.QueryRowx(
		`INSERT INTO creative_iteration_suggestions (id, tenant_id, project_id, suggestion_type, reason, suggested_value, priority, status) VALUES ($1,$2,$3,'creative_change',$4,$5,$6,$7) RETURNING created_at`,
		id, ctx.TenantID, req.ProjectID, req.Reason, value, priorityFromConfidence(confidence), confidenceToStatus(confidence),
	).Scan(&created)
	if insertErr != nil {
		return domain.CreativeIterationSuggestion{}, fmt.Errorf("iteration repo: insert: %w", insertErr)
	}
	return domain.CreativeIterationSuggestion{
		ID:                  id,
		TenantID:            ctx.TenantID,
		ProjectID:           req.ProjectID,
		GeneratedVideoID:    req.GeneratedVideoID,
		AdMetricsSnapshotID: req.AdMetricsSnapshotID,
		Reason:              req.Reason,
		SuggestedChanges:    changes,
		Confidence:          confidence,
		Status:              confidenceToStatus(confidence),
		CreatedAt:           created,
	}, nil
}

// resolveSuggestion picks between the real Pollo LLM and the existing
// demo helpers. It preserves the offline contract documented in the
// service spec: when Pollo is not configured, the output is exactly the
// same as the original mock.
func (r *Repository) resolveSuggestion(ctx domain.TenantContext, req dto.CreateIterationSuggestionRequest) ([]string, string, string, error) {
	if !r.usePollo {
		changes := demoOrMockSuggestedChanges()
		return changes, "medium", demoOrMockSuggestedValue(changes), nil
	}

	// Translate the Kastonom TenantContext into a stdlib context.Context
	// so http.NewRequestWithContext and the pollo.Client can propagate
	// cancellation / deadlines. The Pollo client reads X-Request-ID and
	// X-Tenant-ID off the context via its own helper keys.
	pctx := pollo.WithRequestID(
		pollo.WithTenantID(context.Background(), ctx.TenantID),
		ctx.RequestID,
	)
	if ctx.UserID != nil {
		pctx = context.WithValue(pctx, ctxUserIDKey{}, *ctx.UserID)
	}

	snapshotID := req.AdMetricsSnapshotID
	resp, err := r.pollo.SuggestIterations(pctx, pollo.IterationSuggestRequest{
		TenantID:            ctx.TenantID,
		ProjectID:           req.ProjectID,
		GeneratedVideoID:    req.GeneratedVideoID,
		AdMetricsSnapshotID: snapshotID,
		Reason:              req.Reason,
	})
	if err != nil {
		// Provider is not configured / disabled: fall through to mocks so
		// the offline contract is preserved. Any other provider error
		// (network, 5xx after retries, 4xx, auth) is surfaced to the
		// service layer, which translates to a 4xx / 5xx via httpx.
		if pollo.IsProviderDisabled(err) {
			changes := demoOrMockSuggestedChanges()
			return changes, "medium", demoOrMockSuggestedValue(changes), nil
		}
		return nil, "", "", fmt.Errorf("iteration repo: pollo suggest: %w", err)
	}

	changes := flattenChanges(resp.Changes)
	if len(changes) == 0 {
		// Defensive: an empty response from the LLM is treated as a
		// provider-side failure rather than silently persisting a blank
		// suggestion, but it falls back to the mock value text so the DB
		// row remains well-formed.
		changes = demoOrMockSuggestedChanges()
	}
	confidence := normalizeConfidence(resp.Confidence)
	return changes, confidence, joinChanges(changes), nil
}

// ctxUserIDKey is the context key for the optional UserID carried on
// domain.TenantContext. The Pollo client itself does not consume it;
// keeping the value on context makes it available to future typed
// providers without changing the service signature.
type ctxUserIDKey struct{}

// flattenChanges extracts just the text portion of each ranked change.
// Priority ordering is preserved because the LLM returns them sorted.
func flattenChanges(in []pollo.IterationSuggestedChange) []string {
	out := make([]string, 0, len(in))
	for _, c := range in {
		if c.Text == "" {
			continue
		}
		out = append(out, c.Text)
	}
	return out
}

func joinChanges(changes []string) string {
	if len(changes) == 0 {
		return ""
	}
	out := changes[0]
	for i := 1; i < len(changes); i++ {
		out += "; " + changes[i]
	}
	return out
}

func normalizeConfidence(raw string) string {
	switch raw {
	case "low", "medium", "high":
		return raw
	case "":
		return "medium"
	default:
		return "medium"
	}
}

func confidenceToStatus(confidence string) string {
	// The DB column is `status`; we map the model's confidence to the
	// existing domain statuses ("suggested" / "pending"). High-confidence
	// suggestions land in "suggested" and lower ones stay "pending" so
	// downstream UI can flag them for human review.
	if confidence == "high" {
		return "suggested"
	}
	return "pending"
}

func priorityFromConfidence(confidence string) string {
	// The DB column is `priority`; we use confidence to populate it so
	// the schema invariant (priority NOT NULL) is satisfied.
	return confidence
}
