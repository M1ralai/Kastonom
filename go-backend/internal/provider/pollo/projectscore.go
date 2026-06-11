package pollo

import (
	"context"
	"fmt"
	"net/url"

	httpclient "github.com/M1ralai/Kastonom/backend/internal/shared/httpclient"
	"github.com/M1ralai/Kastonom/backend/internal/shared/providererr"
)

// ProjectScoreIdempotencyKey returns a deterministic key derived from
// (tenant_id, project_id, request_id). It is exported so tests can assert
// the same input always produces the same key. The implementation reuses
// the shared httpclient idempotency helper so behaviour stays uniform
// across every provider endpoint that needs one.
func ProjectScoreIdempotencyKey(tenantID, projectID, requestID string) string {
	return httpclient.IdempotencyKey(tenantID, projectID, requestID)
}

// ProjectScoreRequest is the body posted to POST /v1/insights/project-score.
// All fields are sent as documented in the Pollo project-score API; the
// client only adds the Idempotency-Key header so retries are safe.
type ProjectScoreRequest struct {
	TenantID        string   `json:"tenant_id"`
	ProjectID       string   `json:"project_id"`
	SubjectID       string   `json:"subject_id"`
	SubjectName     string   `json:"subject_name"`
	SubjectType     string   `json:"subject_type,omitempty"`
	Price           *float64 `json:"price,omitempty"`
	Currency        *string  `json:"currency,omitempty"`
	LandingURL      *string  `json:"landing_url,omitempty"`
	AllowedClaims   []string `json:"allowed_claims,omitempty"`
	ForbiddenClaims []string `json:"forbidden_claims,omitempty"`
	UnknownFields   []string `json:"unknown_fields,omitempty"`
	Description     *string  `json:"description,omitempty"`
}

// ProjectScoreResponse mirrors the Pollo /v1/insights/project-score response.
// We only consume a stable subset; unknown fields are ignored by encoding/json.
type ProjectScoreResponse struct {
	ProjectID     string   `json:"project_id"`
	MarginPercent *int     `json:"margin_percent"`
	StockCount    *int     `json:"stock_count"`
	StockSignal   *string  `json:"stock_signal"`
	AIScore       *int     `json:"ai_score"`
	AIReasons     []string `json:"ai_reasons"`
	ProviderJobID *string  `json:"provider_job_id"`
}

// ProjectScore calls POST /v1/insights/project-score on Pollo. ctx must
// already carry request_id / tenant_id (use WithRequestID / WithTenantID)
// so they propagate as X-Request-ID and X-Tenant-ID headers. idempotencyKey
// should be a deterministic value derived from (tenant_id, project_id,
// request_id) so retries cannot double-bill.
func (c *Client) ProjectScore(
	ctx context.Context,
	req ProjectScoreRequest,
	idempotencyKey string,
) (*ProjectScoreResponse, error) {
	if !c.Enabled() {
		return nil, providererr.Wrap(
			providererr.ErrProviderBadRequest,
			"pollo: project-score requested but POLLO_API_KEY is empty",
			nil,
		)
	}
	if req.ProjectID == "" {
		return nil, providererr.Wrap(
			providererr.ErrProviderBadRequest,
			"pollo: project-score requires non-empty project_id",
			nil,
		)
	}
	headers := map[string]string{
		"X-Idempotency-Key": idempotencyKey,
	}
	var resp ProjectScoreResponse
	if err := c.callWithHeaders(
		ctx,
		"POST",
		"/v1/insights/project-score",
		url.Values{},
		req,
		headers,
		&resp,
		1,
	); err != nil {
		return nil, err
	}
	if resp.ProjectID == "" {
		// Defensive: an empty project_id from the provider is almost
		// certainly a bug or HTML error page mis-decoded as JSON.
		return nil, providererr.Wrap(
			providererr.ErrProviderUnavailable,
			fmt.Sprintf("pollo: project-score returned empty project_id for %s", req.ProjectID),
			nil,
		)
	}
	return &resp, nil
}
