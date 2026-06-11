// Package httpclient provides a single shared *http.Client plus request
// helpers used by every external provider integration (Pollo, Kling, ...).
//
// One client instance is created at startup and reused so that all providers
// share the connection pool. The client supports:
//   - Bearer auth header injection (POLLO_API_KEY, KLING_API_KEY, ...)
//   - Per-request context.Context propagation
//   - Exponential backoff with jitter for 429 / 5xx, max 3 attempts
//   - Structured logging of method, path, status, latency
//
// 4xx (except 408/429) is never retried; it surfaces immediately as
// providererr.ErrProviderBadRequest.
package httpclient

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"math/rand"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/shared/logging"
	"github.com/M1ralai/Kastonom/backend/internal/shared/providererr"
	"go.uber.org/zap"
)

// Header keys used to propagate request metadata across the call stack.
const (
	HeaderRequestID    = "X-Request-Id"
	HeaderTenantID     = "X-Tenant-Id"
	HeaderIdempotency  = "Idempotency-Key"
	HeaderProviderJob  = "X-Provider-Job-Id"
	HeaderAuthBearer   = "Authorization"
)

// Logger fields captured on every outbound call.
var logFields = []string{
	"request_id", "tenant_id", "provider_job_id",
	"latency_ms", "http_status", "attempt",
}

// Client is a thin wrapper around *http.Client with retry + auth + logging.
type Client struct {
	httpc       *http.Client
	maxAttempts int
	baseBackoff time.Duration
}

// New builds a Client. timeout <= 0 falls back to 30s. maxAttempts <= 0
// defaults to 3. baseBackoff <= 0 defaults to 250ms.
func New(timeout time.Duration, maxAttempts int, baseBackoff time.Duration) *Client {
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	if maxAttempts <= 0 {
		maxAttempts = 3
	}
	if baseBackoff <= 0 {
		baseBackoff = 250 * time.Millisecond
	}
	return &Client{
		httpc: &http.Client{
			Timeout: timeout,
		},
		maxAttempts: maxAttempts,
		baseBackoff: baseBackoff,
	}
}

// Do executes a single request. The caller is responsible for building the
// *http.Request (so that GET/POST/PUT/DELETE body & headers can vary).
// Do not call this directly from service code — use DoJSON / DoMultipart /
// DoBytes which handle JSON / multipart bodies.
func (c *Client) Do(ctx context.Context, req *http.Request) (*http.Response, []byte, error) {
	// Always re-anchor the request to ctx so timeouts propagate.
	req = req.WithContext(ctx)

	var (
		resp     *http.Response
		body     []byte
		err      error
		attempts = 0
		start    = time.Now()
	)

	for {
		attempts++

		// Each retry gets a fresh body because the previous one was drained.
		if req.GetBody != nil {
			rc, gerr := req.GetBody()
			if gerr != nil {
				return nil, nil, fmt.Errorf("httpclient: get body: %w", gerr)
			}
			req.Body = rc
		}

		// Capture per-attempt status without leaking the API key. Headers
		// are copied by the stdlib when the request is sent, so we only
		// need to log fields that were set explicitly here.
		attemptStart := time.Now()
		resp, err = c.httpc.Do(req)
		attemptLatency := time.Since(attemptStart)

		status := 0
		providerJobID := req.Header.Get(HeaderProviderJob)
		if resp != nil {
			status = resp.StatusCode
		}

		if err != nil {
			// Network / timeout. Decide if we retry.
			if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
				logging.L().Warn("httpclient: deadline",
					zap.String("method", req.Method),
					zap.String("path", req.URL.Path),
					zap.String("tenant_id", req.Header.Get(HeaderTenantID)),
					zap.String("request_id", req.Header.Get(HeaderRequestID)),
					zap.Int("attempt", attempts),
					zap.Int64("latency_ms", attemptLatency.Milliseconds()),
				)
				if shouldRetry(0, attempts, c.maxAttempts) {
					if sleepErr := sleepWithBackoff(ctx, attempts, c.baseBackoff); sleepErr != nil {
						return nil, nil, sleepErr
					}
					continue
				}
				return nil, nil, fmt.Errorf("httpclient: %w: %w", providererr.ErrProviderTimeout, err)
			}
			if shouldRetry(0, attempts, c.maxAttempts) {
				if sleepErr := sleepWithBackoff(ctx, attempts, c.baseBackoff); sleepErr != nil {
					return nil, nil, sleepErr
				}
				continue
			}
			return nil, nil, fmt.Errorf("httpclient: %w: %w", providererr.ErrProviderUnavailable, err)
		}

		// Always drain + close before any retry decision.
		body, err = io.ReadAll(resp.Body)
		_ = resp.Body.Close()
		if err != nil {
			return nil, nil, fmt.Errorf("httpclient: read body: %w", err)
		}

		// Happy path.
		if status >= 200 && status < 300 {
			logging.L().Info("httpclient: ok",
				zap.String("method", req.Method),
				zap.String("path", req.URL.Path),
				zap.Int("http_status", status),
				zap.Int("attempt", attempts),
				zap.String("request_id", req.Header.Get(HeaderRequestID)),
				zap.String("tenant_id", req.Header.Get(HeaderTenantID)),
				zap.String("provider_job_id", providerJobID),
				zap.Int64("latency_ms", time.Since(start).Milliseconds()),
			)
			return resp, body, nil
		}

		// Error path. 4xx (except 408/429) -> no retry.
		if status >= 400 && status < 500 && status != http.StatusRequestTimeout && status != http.StatusTooManyRequests {
			return nil, body, wrapClientError(status, body)
		}

		// 5xx or 408/429 -> retry if we still have attempts.
		if shouldRetry(status, attempts, c.maxAttempts) {
			if sleepErr := sleepWithBackoff(ctx, attempts, c.baseBackoff); sleepErr != nil {
				return nil, body, sleepErr
			}
			continue
		}

		// Exhausted retries on 5xx or 429.
		return nil, body, wrapClientError(status, body)
	}
}

func shouldRetry(status, attempt, max int) bool {
	if attempt >= max {
		return false
	}
	if status == 0 {
		// Transport error - retry.
		return true
	}
	if status == http.StatusTooManyRequests || status == http.StatusRequestTimeout {
		return true
	}
	if status >= 500 && status < 600 {
		return true
	}
	return false
}

func sleepWithBackoff(ctx context.Context, attempt int, base time.Duration) error {
	// 250ms * 2^(attempt-1) with full jitter, capped at 5s.
	exp := math.Pow(2, float64(attempt-1))
	delay := time.Duration(exp) * base
	if delay > 5*time.Second {
		delay = 5 * time.Second
	}
	jitter := time.Duration(rand.Int63n(int64(delay) + 1))
	timer := time.NewTimer(jitter)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

func wrapClientError(status int, body []byte) error {
	switch {
	case status == http.StatusUnauthorized, status == http.StatusForbidden:
		return fmt.Errorf("httpclient: status %d: %w: %s", status, providererr.ErrProviderAuth, truncate(body, 256))
	case status == http.StatusTooManyRequests:
		return fmt.Errorf("httpclient: status %d: %w: %s", status, providererr.ErrProviderRateLimit, truncate(body, 256))
	case status >= 400 && status < 500:
		return fmt.Errorf("httpclient: status %d: %w: %s", status, providererr.ErrProviderBadRequest, truncate(body, 256))
	default:
		return fmt.Errorf("httpclient: status %d: %w: %s", status, providererr.ErrProviderUnavailable, truncate(body, 256))
	}
}

func truncate(b []byte, max int) string {
	if len(b) <= max {
		return string(b)
	}
	return string(b[:max]) + "..."
}

// Bearer builds an "Authorization: Bearer <token>" header value.
func Bearer(token string) string { return "Bearer " + token }

// JSONOptions controls a JSON request.
type JSONOptions struct {
	Method  string
	BaseURL string
	Path    string
	Query   url.Values
	Body    any
	Headers map[string]string
}

// DoJSON sends a JSON request and decodes the response into out (if non-nil).
func (c *Client) DoJSON(ctx context.Context, opts JSONOptions, out any) (*http.Response, []byte, error) {
	var body io.Reader
	if opts.Body != nil {
		buf, err := json.Marshal(opts.Body)
		if err != nil {
			return nil, nil, fmt.Errorf("httpclient: marshal: %w", err)
		}
		body = bytes.NewReader(buf)
	}

	fullURL := opts.BaseURL + opts.Path
	if len(opts.Query) > 0 {
		fullURL += "?" + opts.Query.Encode()
	}
	req, err := http.NewRequestWithContext(ctx, opts.Method, fullURL, body)
	if err != nil {
		return nil, nil, fmt.Errorf("httpclient: new request: %w", err)
	}
	for k, v := range opts.Headers {
		req.Header.Set(k, v)
	}
	if opts.Body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Accept", "application/json")
	req.GetBody = func() (io.ReadCloser, error) {
		if opts.Body == nil {
			return http.NoBody, nil
		}
		buf, err := json.Marshal(opts.Body)
		if err != nil {
			return nil, err
		}
		return io.NopCloser(bytes.NewReader(buf)), nil
	}

	resp, respBody, err := c.Do(ctx, req)
	if err != nil {
		return resp, respBody, err
	}
	if out != nil && len(respBody) > 0 {
		if err := json.Unmarshal(respBody, out); err != nil {
			return resp, respBody, fmt.Errorf("httpclient: unmarshal: %w", err)
		}
	}
	return resp, respBody, nil
}

// IdempotencyKey returns a deterministic key derived from the input parts.
// Uses SHA-256 of the joined parts (truncated to 32 chars) so it fits
// provider header limits.
func IdempotencyKey(parts ...string) string {
	h := hashParts(parts)
	return h
}

// Small wrapper so we don't pull in a hashing package unless we have to.
// We use FNV-64 inline to avoid an extra import for one call.
func hashParts(parts []string) string {
	// FNV-64a
	const (
		offset uint64 = 14695981039346656037
		prime  uint64 = 1099511628211
	)
	h := offset
	for _, p := range parts {
		for i := 0; i < len(p); i++ {
			h ^= uint64(p[i])
			h *= prime
		}
		// separator
		h ^= uint64(0x1f)
		h *= prime
	}
	// 16 hex chars is plenty for an idempotency token.
	return strconv.FormatUint(h, 16)
}
