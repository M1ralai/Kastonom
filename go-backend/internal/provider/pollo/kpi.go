package pollo

import (
	"context"
	"fmt"
	"net/url"

	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/providererr"
)

// KpiSummaryRequest is the request shape for GET
// /v1/analytics/tenant/{tenant_id}/kpi-summary. The endpoint takes only the
// path parameter; query parameters are reserved for future filtering
// (e.g. window, sector) and intentionally optional.
type KpiSummaryRequest struct {
	TenantID string
	// Window is optional. When set it is forwarded as ?window=<value>.
	Window string
	// Sector is optional. When set it is forwarded as ?sector=<value>.
	Sector string
}

// KpiSummaryResponse mirrors the Pollo AI response shape documented at
// docs.pollo.ai (replaces the previous hardcoded values in
// demoOrMockKpiSummary). All fields are pointers so we can distinguish
// "provider did not return this field" from a zero value — repository
// code is responsible for filling the dto.KpiSummaryResponse default
// currency / etc.
type KpiSummaryResponse struct {
	ProviderJobID     *string  `json:"provider_job_id,omitempty"`
	RemainingCredits  *int     `json:"remaining_credits"`
	CreditCurrency    *string  `json:"credit_currency"`
	AverageCTR        *float64 `json:"average_ctr"`
	SectorAverageCTR  *float64 `json:"sector_average_ctr"`
	CTRChangePercent  *int     `json:"ctr_change_percent"`
	MonthlyVideoCount *int     `json:"monthly_video_count"`
	MonthlyVideoDelta *int     `json:"monthly_video_delta"`
}

// KpiSummary calls GET /v1/analytics/tenant/{tenant_id}/kpi-summary.
//
// Authoritative source for the dashboard's KPI tile. The function
// propagates context (deadline / cancellation), forwards the tenant id
// and request id to Pollo via the X-Tenant-ID / X-Request-ID headers, and
// wraps every error with the shared providererr sentinels so the service
// layer can errors.Is on ErrPolloUnavailable / ErrPolloAuth / etc.
func (c *Client) KpiSummary(ctx context.Context, tenant domain.TenantContext, req KpiSummaryRequest) (*KpiSummaryResponse, error) {
	if c == nil || !c.Enabled() {
		return nil, providererr.Wrap(providererr.ErrPolloAuth, "pollo: kpi-summary", fmt.Errorf("client not configured"))
	}
	if req.TenantID == "" {
		return nil, providererr.Wrap(providererr.ErrPolloBadRequest, "pollo: kpi-summary", fmt.Errorf("tenant id is required"))
	}
	ctx = WithRequestID(ctx, tenant.RequestID)
	ctx = WithTenantID(ctx, tenant.TenantID)

	path := "/v1/analytics/tenant/" + url.PathEscape(req.TenantID) + "/kpi-summary"
	var query url.Values
	if req.Window != "" || req.Sector != "" {
		query = url.Values{}
		if req.Window != "" {
			query.Set("window", req.Window)
		}
		if req.Sector != "" {
			query.Set("sector", req.Sector)
		}
	}

	var out KpiSummaryResponse
	if err := c.Call(ctx, "GET", path, query, nil, &out); err != nil {
		return nil, err
	}
	return &out, nil
}
