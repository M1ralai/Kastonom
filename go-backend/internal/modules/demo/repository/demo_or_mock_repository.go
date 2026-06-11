// Package repository implements the demo-fallback replay repository.
//
// INTENT (Phase 3 migration, domain: demo-fallback):
//
//	The demo module is INTENTIONALLY PRESERVED as the offline/Pollo-down
//	replay path. There is no Pollo endpoint to call here — when Pollo is
//	unavailable, /demo/fallback serves the most recent project for the
//	tenant directly from the local DB. The module is scheduled for later
//	deletion, but its interface contract (DemoReplayRepository.GetReplay)
//	must remain stable so that:
//	  - bootstrap wiring in internal/bootstrap/app.go keeps compiling,
//	  - handler.Fallback and service.Fallback callers see no signature drift,
//	  - tests / mocks that depend on this surface continue to work.
//
// DO NOT:
//   - Swap this body for a real Pollo HTTP call. The Pollo migration brief
//     for the demo-fallback domain explicitly says: "Demo module remains
//     a placeholder for offline/Pollo-down replay. The module is to be
//     deleted later but its interface must stay stable. Do NOT swap in a
//     Pollo call."
//   - Change the GetReplay signature (tenantID string) (dto.DemoFallbackResponse, error).
//   - Rename the package, the Repository struct, or the New constructor.
//
// If/when this module is deleted, remove the demo wiring from
// internal/bootstrap/app.go and delete the demo module directory in one
// commit so the compiler stays green.
package repository

import (
	"fmt"

	"github.com/M1ralai/Kastonom/backend/internal/modules/demo/dto"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/logging"
	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

// sqlx does not export a sentinel for "no rows". The error from
// database/sql when Get misses a row is "sql: no rows in result set".
// We match by string to stay signature-compatible with the existing
// demo-fallback contract (no new error type introduced).
const sqlNoRows = "sql: no rows in result set"

type DemoReplayRepository interface {
	GetReplay(tenantID string) (dto.DemoFallbackResponse, error)
}
type Repository struct{ db *sqlx.DB }

func New(db *sqlx.DB) *Repository { return &Repository{db: db} }

// GetReplay is the offline-fallback replay read. It is intentionally a
// pure local-DB read — no Pollo dependency. The signature is frozen by
// the demo-fallback contract; callers in demo/service and any future
// consumer depend on (string) -> (dto.DemoFallbackResponse, error).
//
// Errors are wrapped with %w so callers can use errors.Is/errors.As.
// A missing row is NOT an error: we return the empty response with
// FallbackReason set so the demo handler can still serve a 200.
func (r *Repository) GetReplay(tenantID string) (dto.DemoFallbackResponse, error) {
	res := dto.DemoFallbackResponse{
		SourceAssets:    []domain.SourceAsset{},
		GeneratedVideos: []domain.GeneratedVideo{},
		FallbackReason:  "demo replay",
	}
	if r.db == nil {
		logging.L().Warn("demo replay called without a DB handle; returning empty offline payload",
			zap.String("tenant_id", tenantID),
		)
		return res, nil
	}
	var project domain.CreativeProject
	err := r.db.Get(&project, `SELECT id, tenant_id AS tenantid, name, status, selected_generated_video_id AS selectedgeneratedvideoid, latest_generation_request_id AS latestgenerationrequestid, created_at AS createdat, updated_at AS updatedat FROM creative_projects WHERE tenant_id=$1 ORDER BY updated_at DESC LIMIT 1`, tenantID)
	if err != nil {
		if err.Error() == sqlNoRows {
			// No prior project for this tenant — still a valid offline replay.
			return res, nil
		}
		// Real DB error: wrap and surface. Service/handler can errors.As it.
		logging.L().Warn("demo replay DB lookup failed; returning empty offline payload",
			zap.String("tenant_id", tenantID),
			zap.Error(err),
		)
		return res, fmt.Errorf("demo replay: %w", err)
	}
	res.CreativeProject = &project
	return res, nil
}
