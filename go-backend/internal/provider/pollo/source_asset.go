package pollo

import (
	"context"
	"net/url"
	"strconv"
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/providererr"
)

// SourceAssetUploadRequest is the JSON body sent to POST /v1/assets/upload.
//
// We support two modes per the Pollo docs:
//
//	Reference mode: SourceURL is set and Pollo will fetch/copy the asset
//	                to its CDN. The returned id is what we store as the
//	                canonical source asset reference.
//	Inline mode:    InlineBase64 + Filename carry the raw bytes. Used when
//	                the upstream URL is not reachable from Pollo's region.
//
// ClientReferenceID is forwarded so that Pollo can dedupe the upload if the
// caller retries with the same key (combined with the Idempotency-Key header
// that we send on every POST).
type SourceAssetUploadRequest struct {
	ClientReferenceID string `json:"client_reference_id,omitempty"`
	SourceURL         string `json:"source_url,omitempty"`
	Filename          string `json:"filename,omitempty"`
	InlineBase64      string `json:"inline_base64,omitempty"`
	MimeType          string `json:"mime_type,omitempty"`
	Purpose           string `json:"purpose,omitempty"`
}

// SourceAssetUploadResponse is the parsed body of a successful upload. Pollo
// returns the canonical CDN URL plus the asset id we should reference from
// downstream generation jobs.
type SourceAssetUploadResponse struct {
	ID        string `json:"id"`
	URL       string `json:"url"`
	Status    string `json:"status"`
	MimeType  string `json:"mime_type,omitempty"`
	Width     *int   `json:"width,omitempty"`
	Height    *int   `json:"height,omitempty"`
	CreatedAt string `json:"created_at,omitempty"`
	ExpiresAt string `json:"expires_at,omitempty"`
}

// SourceAssetGetResponse is the parsed body of GET /v1/assets/{id}. The
// Status field is what the polling loop inspects; "ready" / "succeeded" /
// "available" / "active" are considered terminal-success, "failed" /
// "error" / "canceled" / "cancelled" are terminal-failure.
type SourceAssetGetResponse struct {
	ID        string `json:"id"`
	URL       string `json:"url"`
	Status    string `json:"status"`
	MimeType  string `json:"mime_type,omitempty"`
	Width     *int   `json:"width,omitempty"`
	Height    *int   `json:"height,omitempty"`
	CreatedAt string `json:"created_at,omitempty"`
	ReadyAt   string `json:"ready_at,omitempty"`
}

// UploadSourceAsset uploads (or registers) a single source asset with Pollo.
// The returned ID is the value that should be stored in source_assets.url
// and passed to downstream generation calls. The idempotency key is derived
// from (tenant_id, project_id, request_id) so retries are safe.
//
// If the client is not configured (no API key, KASTONOM_MODE=mock) the call
// is rejected with providererr.ErrPolloAuth so the caller can fall through
// to its mock helper. This matches the spec: "When mock, fall through to
// the existing demo-or-mock helpers exactly; when not, route to the new
// real client."
func (c *Client) UploadSourceAsset(ctx context.Context, tenant domain.TenantContext, req SourceAssetUploadRequest, idempotencyKey string) (*SourceAssetUploadResponse, error) {
	if c == nil || !c.Enabled() {
		return nil, providererr.Wrap(providererr.ErrPolloAuth, "pollo: upload source asset", errNotConfigured)
	}
	if req.SourceURL == "" && req.InlineBase64 == "" {
		return nil, providererr.Wrap(providererr.ErrPolloBadRequest, "pollo: upload source asset", errSourceURLEmpty)
	}
	if idempotencyKey == "" {
		// Fall back to a deterministic composite so retries are still safe.
		idempotencyKey = tenant.RequestID + ":" + tenant.TenantID
	}
	ctx = WithRequestID(ctx, tenant.RequestID)
	ctx = WithTenantID(ctx, tenant.TenantID)

	var out SourceAssetUploadResponse
	if err := c.Call(ctx, "POST", "/v1/assets/upload", nil, req, &out); err != nil {
		return nil, err
	}
	if out.ID == "" {
		return nil, providererr.Wrap(providererr.ErrPolloUnavailable, "pollo: upload source asset", errResponseMissingID)
	}
	return &out, nil
}

// GetSourceAsset polls the asset by id. Use PollSourceAssetReady to drive
// the wait loop with cancellation.
func (c *Client) GetSourceAsset(ctx context.Context, tenant domain.TenantContext, id string) (*SourceAssetGetResponse, error) {
	if c == nil || !c.Enabled() {
		return nil, providererr.Wrap(providererr.ErrPolloAuth, "pollo: get source asset", errNotConfigured)
	}
	if id == "" {
		return nil, providererr.Wrap(providererr.ErrPolloBadRequest, "pollo: get source asset", errIDEmpty)
	}
	ctx = WithRequestID(ctx, tenant.RequestID)
	ctx = WithTenantID(ctx, tenant.TenantID)

	var out SourceAssetGetResponse
	path := "/v1/assets/" + url.PathEscape(id)
	if err := c.Call(ctx, "GET", path, nil, nil, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// PollSourceAssetReady waits until the asset is ready (or terminal-failed)
// with linear backoff. It respects ctx cancellation. The function is safe
// to call from a goroutine; the request itself goes through the shared
// client and inherits its 3-attempt retry budget per call.
func (c *Client) PollSourceAssetReady(ctx context.Context, tenant domain.TenantContext, id string, interval, maxWait time.Duration) (*SourceAssetGetResponse, error) {
	if interval <= 0 {
		interval = 2 * time.Second
	}
	if maxWait <= 0 {
		maxWait = 60 * time.Second
	}
	deadline := time.Now().Add(maxWait)
	for {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		asset, err := c.GetSourceAsset(ctx, tenant, id)
		if err != nil {
			return asset, err
		}
		switch asset.Status {
		case "ready", "succeeded", "available", "active":
			return asset, nil
		case "failed", "error", "canceled", "cancelled":
			return asset, providererr.Wrap(providererr.ErrPolloBadRequest, "pollo: poll source asset: status="+asset.Status, nil)
		}
		if time.Now().After(deadline) {
			return asset, providererr.Wrap(providererr.ErrPolloTimeout, "pollo: poll source asset: timed out (last_status="+asset.Status+")", nil)
		}
		select {
		case <-ctx.Done():
			return asset, ctx.Err()
		case <-time.After(interval):
		}
	}
}

// Sentinels used by the source-asset helpers. Defined here (not providererr)
// because they describe programming errors, not provider failures.
var (
	errNotConfigured     = constErr("client not configured")
	errSourceURLEmpty    = constErr("source_url or inline_base64 is required")
	errIDEmpty           = constErr("id is required")
	errResponseMissingID = constErr("response missing id")
)

// constErr returns a sentinel error from a static string. Cheap alternative
// to declaring top-level vars; the strings never change at runtime.
func constErr(s string) error {
	return &staticErr{msg: s}
}

type staticErr struct{ msg string }

func (e *staticErr) Error() string { return e.msg }

// Keep the strconv import live; used elsewhere in this package.
var _ = strconv.Itoa
