package repository

import (
	"context"
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/modules/dashboard/dto"
	"github.com/M1ralai/Kastonom/backend/internal/provider/pollo"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/logging"
	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

type DashboardReadRepository interface {
	GetKpiSummary(tenantID string) (dto.KpiSummaryResponse, error)
	GetRecentActivities(tenantID string, limit int) (dto.RecentActivitiesResponse, error)
}

// Repository is the dashboard's read-side repository. It optionally
// holds a *pollo.Client for real KPI lookups; when the client is nil or
// the surrounding process is running in KASTONOM_MODE=mock the existing
// demoOrMock helpers are used exactly so the offline contract is
// preserved. The DashboardReadRepository interface signature is
// preserved bit-for-bit: callers see the same GetKpiSummary(tenantID)
// entry point.
type Repository struct {
	db        *sqlx.DB
	pollo     *pollo.Client
	mode      string
	requestID string
}

func New(db *sqlx.DB) *Repository { return &Repository{db: db, mode: "mock"} }

// NewWithPollo is the preferred constructor when the bootstrap layer has
// configured a real Pollo client. mode is read from domain.AppConfig
// (KASTONOM_MODE); the requestID is the current Fiber request id and is
// forwarded to Pollo so logs are correlatable.
func NewWithPollo(db *sqlx.DB, client *pollo.Client, mode, requestID string) *Repository {
	return &Repository{db: db, pollo: client, mode: mode, requestID: requestID}
}

func (r *Repository) GetKpiSummary(tenantID string) (dto.KpiSummaryResponse, error) {
	var count int
	if err := r.db.Get(&count, `SELECT COUNT(*) FROM generated_videos WHERE tenant_id=$1 AND created_at >= date_trunc('month', now())`, tenantID); err != nil {
		return dto.KpiSummaryResponse{}, err
	}

	// Real Pollo path: when KASTONOM_MODE is not "mock" and the client is
	// configured, attempt the authoritative lookup. Any failure falls
	// back to the existing demoOrMock helper so the dashboard stays
	// available even when Pollo is degraded. This matches the shared
	// concerns in the migration spec: keep mock as runtime fallback.
	if r.mode != "mock" && r.pollo != nil && r.pollo.Enabled() {
		res, err := r.fetchRealKpiSummary(tenantID, count)
		if err == nil {
			return res, nil
		}
		logging.L().Warn("dashboard: falling back to mock kpi summary",
			zap.String("tenant_id", tenantID),
			zap.Error(err),
		)
	}

	return demoOrMockKpiSummary(count), nil
}

// fetchRealKpiSummary calls Pollo's
// GET /v1/analytics/tenant/{tenant_id}/kpi-summary and merges the
// authoritative provider fields (credits, CTR) with the local monthly
// count that lives in our DB. On any provider error it returns the
// underlying providererr-wrapped error so the caller can decide
// whether to fall through to the mock.
func (r *Repository) fetchRealKpiSummary(tenantID string, monthlyVideoCount int) (dto.KpiSummaryResponse, error) {
	// Use a short timeout that still honours the per-call context. The
	// shared httpclient inside pollo enforces a tighter per-request
	// budget; this is the outer ceiling for the whole lookup.
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	resp, err := r.pollo.KpiSummary(ctx, dummyTenantContext(tenantID, r.requestID), pollo.KpiSummaryRequest{
		TenantID: tenantID,
	})
	if err != nil {
		return dto.KpiSummaryResponse{}, err
	}

	// The local count comes from our own DB. The provider may also
	// return its own value — prefer the provider's authoritative number
	// when present.
	count := monthlyVideoCount
	if resp.MonthlyVideoCount != nil {
		count = *resp.MonthlyVideoCount
	}

	out := dto.KpiSummaryResponse{
		MonthlyVideoCount: count,
		// MonthlyVideoChange is the absolute change vs the previous
		// month; the demoOrMock helper previously set it to the same
		// value as the count, but with a real provider we prefer the
		// authoritative delta.
		MonthlyVideoChange: count,
		CreditCurrency:     "credits",
	}
	if resp.MonthlyVideoDelta != nil {
		out.MonthlyVideoChange = *resp.MonthlyVideoDelta
	}
	if resp.RemainingCredits != nil {
		out.RemainingCredits = *resp.RemainingCredits
	} else {
		out.RemainingCredits = 120 - count
	}
	if resp.CreditCurrency != nil && *resp.CreditCurrency != "" {
		out.CreditCurrency = *resp.CreditCurrency
	}
	if resp.AverageCTR != nil {
		out.AverageCTR = *resp.AverageCTR
	} else {
		out.AverageCTR = 2.8
	}
	if resp.SectorAverageCTR != nil {
		out.SectorAverageCTR = *resp.SectorAverageCTR
	} else {
		out.SectorAverageCTR = 2.1
	}
	if resp.CTRChangePercent != nil {
		out.CTRChangePercent = *resp.CTRChangePercent
	} else {
		out.CTRChangePercent = 8
	}
	return out, nil
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

// dummyTenantContext constructs a minimal domain.TenantContext for the
// repository's internal Pollo call. The bootstrap layer is the proper
// place to build full TenantContext instances; here we only need the
// request id and tenant id to populate X-Request-ID / X-Tenant-ID
// headers on the outbound call.
func dummyTenantContext(tenantID, requestID string) domain.TenantContext {
	return domain.TenantContext{
		RequestID: requestID,
		TenantID:  tenantID,
		Mode:      "live",
	}
}
