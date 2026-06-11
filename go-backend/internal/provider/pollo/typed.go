package pollo

import (
	"context"
	"fmt"
	"net/url"

	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/providererr"
)

// Header names exported as constants so callers (e.g. webhook handler) can
// reference them without re-typing strings.
const (
	HeaderAuthorization  = "Authorization"
	HeaderIdempotencyKey = "Idempotency-Key"
	HeaderPolloSignature = "X-Pollo-Signature"
	HeaderRequestID      = "X-Request-ID"
	HeaderTenantID       = "X-Tenant-ID"
)

// ProviderName is the canonical string used in domain.VideoJob.Provider,
// domain.PromptPayload.Provider, and IsMock flags. Must stay in sync with
// the validator's "video_provider" string set in shared/validation.
const ProviderName = "pollo"

// Create submits a new video generation job to POST /v1/videos. The returned
// provider_job_id is what the caller stores on domain.VideoJob.ProviderJobID
// and uses to poll via Get.
//
// idempotencyKey is required; callers should derive it from a deterministic
// hash of (tenant_id, project_id, request_id) so retries are safe per the
// shared concerns in the migration spec.
func (c *Client) Create(ctx context.Context, tenant domain.TenantContext, req CreateVideoRequest, idempotencyKey string) (*CreateVideoResponse, error) {
	if c == nil || !c.Enabled() {
		return nil, providererr.Wrap(providererr.ErrPolloAuth, "pollo: create", fmt.Errorf("client not configured"))
	}
	if idempotencyKey == "" {
		// Fall back to a deterministic composite so retries are still safe.
		idempotencyKey = tenant.RequestID + ":" + tenant.TenantID
	}
	if req.IdempotencyKey == "" {
		req.IdempotencyKey = idempotencyKey
	}
	ctx = WithRequestID(ctx, tenant.RequestID)
	ctx = WithTenantID(ctx, tenant.TenantID)

	var out CreateVideoResponse
	if err := c.Call(ctx, "POST", "/v1/videos", nil, req, &out); err != nil {
		return nil, err
	}
	if out.ProviderJobID == "" {
		// Fall back to "id" if the spec uses a different field name.
		out.ProviderJobID = out.ID
	}
	return &out, nil
}

// Get polls GET /v1/videos/{provider_job_id} and returns the current status.
// The caller is responsible for the polling loop; this method does not block.
func (c *Client) Get(ctx context.Context, tenant domain.TenantContext, providerJobID string) (*GetVideoResponse, error) {
	if c == nil || !c.Enabled() {
		return nil, providererr.Wrap(providererr.ErrPolloAuth, "pollo: get", fmt.Errorf("client not configured"))
	}
	if providerJobID == "" {
		return nil, providererr.Wrap(providererr.ErrPolloBadRequest, "pollo: get", fmt.Errorf("provider_job_id is required"))
	}
	ctx = WithRequestID(ctx, tenant.RequestID)
	ctx = WithTenantID(ctx, tenant.TenantID)

	var out GetVideoResponse
	path := "/v1/videos/" + url.PathEscape(providerJobID)
	if err := c.Call(ctx, "GET", path, nil, nil, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// EstimateCost calls POST /v1/videos/estimate. Used by the public
// estimate-cost endpoint to preview the credit/USD cost before submit.
func (c *Client) EstimateCost(ctx context.Context, tenant domain.TenantContext, req EstimateRequest) (*EstimateResponse, error) {
	if c == nil || !c.Enabled() {
		return nil, providererr.Wrap(providererr.ErrPolloAuth, "pollo: estimate", fmt.Errorf("client not configured"))
	}
	ctx = WithRequestID(ctx, tenant.RequestID)
	ctx = WithTenantID(ctx, tenant.TenantID)

	var out EstimateResponse
	if err := c.Call(ctx, "POST", "/v1/videos/estimate", nil, req, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// VerifyWebhookSignature returns true iff the X-Pollo-Signature header equals
// the hex-encoded HMAC-SHA256 of body using the configured POLLO_WEBHOOK_SECRET.
// Comparison is constant time (hmac.Equal) to avoid timing attacks. A nil
// client, missing secret, or empty signature returns false.
//
// The webhook handler MUST call this before any DB write.
func (c *Client) VerifyWebhookSignature(body []byte, signature string) bool {
	if c == nil {
		return false
	}
	// The Client struct in client.go does not currently expose a secret
	// accessor. We re-derive the expected value via the package-level
	// computeHMACSHA256 helper, which is also used in tests.
	secret := c.webhookSecret()
	if secret == "" || signature == "" {
		return false
	}
	expected := computeHMACSHA256(secret, body)
	return constantTimeEqual(expected, signature)
}

// Ping has moved to client.go to keep the HTTP primitives in one place.
// The health probe calls Client.Ping; nothing in this file defines it.
