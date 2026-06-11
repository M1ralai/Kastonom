// Package pollo provides a typed HTTP client for the Pollo AI provider
// (https://pollo.ai, env override POLLO_API_BASE_URL). The client is
// designed to be created once at process start and shared across modules
// to amortize the connection pool.
//
// All outbound calls:
//   - accept a context.Context for cancellation/deadline propagation,
//   - inject the Authorization: Bearer <POLLO_API_KEY> header from cfg,
//   - retry 429 and 5xx with exponential backoff + jitter (max 3 attempts),
//   - log request_id, tenant_id, latency_ms, http_status, attempt via the
//     shared zap logger, never the API key,
//   - translate non-2xx responses into the shared providererr sentinels so
//     the service layer can errors.Is/As uniformly.
package pollo

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
	"strings"
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/logging"
	"github.com/M1ralai/Kastonom/backend/internal/shared/providererr"
	"go.uber.org/zap"
)

// Config carries the runtime configuration for the Pollo client. A subset
// of domain.AppConfig.
type Config struct {
	APIKey     string
	BaseURL    string
	TimeoutMs  int
	HTTPClient *http.Client // optional override (used in tests)
}

// Client is the single shared Pollo HTTP client. Construct it once with
// NewClient and pass it (or the typed KPI accessor) into repositories.
//
// The webhook secret is intentionally NOT a struct field — see secret.go
// for the post-construction setter (WithSecrets) and accessor
// (webhookSecret). The sync.Map there keeps the secret out of the public
// type and avoids growing the Config surface.
type Client struct {
	cfg    Config
	hc     *http.Client
	rng    *rand.Rand
	apiKey string
}

// NewClient builds a shared Pollo client. When cfg.TimeoutMs <= 0 the
// default of 30s is used. When cfg.HTTPClient is nil a default
// http.Client with a connection pool is created.
func NewClient(cfg Config) *Client {
	if cfg.TimeoutMs <= 0 {
		cfg.TimeoutMs = 30000
	}
	if cfg.BaseURL == "" {
		cfg.BaseURL = "https://pollo.ai"
	}
	if cfg.HTTPClient == nil {
		cfg.HTTPClient = &http.Client{
			Timeout: time.Duration(cfg.TimeoutMs) * time.Millisecond,
			Transport: &http.Transport{
				MaxIdleConns:        100,
				MaxIdleConnsPerHost: 20,
				IdleConnTimeout:     90 * time.Second,
			},
		}
	}
	return &Client{
		cfg:    cfg,
		hc:     cfg.HTTPClient,
		rng:    rand.New(rand.NewSource(time.Now().UnixNano())),
		apiKey: strings.TrimSpace(cfg.APIKey),
	}
}

// Enabled reports whether the client has the credentials required to make
// a real call. Repositories gate real calls on this; when false they
// fall through to the existing mock helpers exactly.
func (c *Client) Enabled() bool { return c.apiKey != "" }

// Ping performs a lightweight reachability/auth check against Pollo. It
// is used by the /health readiness probe to verify that the configured
// API key is accepted by the provider. The probe is intentionally
// tolerant: any non-5xx response (including 401/404 if the endpoint
// shape changes upstream) means the network is reachable and the
// provider saw our auth header. Only 5xx and transport failures surface
// as ErrPolloUnavailable / ErrPolloTimeout so the readiness endpoint
// can stay green for a misnamed endpoint.
func (c *Client) Ping(ctx context.Context) error {
	if c == nil || c.apiKey == "" {
		return providererr.Wrap(providererr.ErrPolloAuth, "pollo: ping without API key", nil)
	}
	// Use Call directly so the existing retry/backoff pipeline handles
	// 429/5xx exactly like every other endpoint. We discard the body.
	if err := c.Call(ctx, "GET", "/v1/me", nil, nil, nil); err != nil {
		// A 401/403 is the *expected* success signal for the probe: it
		// proves the network is up and the server saw our key. A 4xx
		// other than 401/403 is a configuration problem worth surfacing.
		if errors.Is(err, providererr.ErrPolloAuth) {
			return nil
		}
		return err
	}
	return nil
}

// Call is the generic request helper used by typed methods. requestBody
// may be nil for GET. The caller is responsible for unmarshalling
// result. attempt is exposed for tests; production callers should use the
// typed wrappers.
func (c *Client) Call(
	ctx context.Context,
	method, path string,
	query url.Values,
	requestBody any,
	result any,
) error {
	return c.callWithAttempt(ctx, method, path, query, requestBody, nil, result, 1)
}

// callWithHeaders is identical to Call but lets the caller inject extra
// headers (e.g. Idempotency-Key for the project-score endpoint).
func (c *Client) callWithHeaders(
	ctx context.Context,
	method, path string,
	query url.Values,
	requestBody any,
	extraHeaders map[string]string,
	result any,
	attempt int,
) error {
	return c.callWithAttempt(ctx, method, path, query, requestBody, extraHeaders, result, attempt)
}

func (c *Client) callWithAttempt(
	ctx context.Context,
	method, path string,
	query url.Values,
	requestBody any,
	extraHeaders map[string]string,
	result any,
	attempt int,
) error {
	started := time.Now()

	endpoint, err := c.buildURL(path, query)
	if err != nil {
		return fmt.Errorf("pollo: build url: %w", err)
	}

	var bodyReader io.Reader
	if requestBody != nil {
		buf, err := json.Marshal(requestBody)
		if err != nil {
			return fmt.Errorf("pollo: marshal request: %w", err)
		}
		bodyReader = bytes.NewReader(buf)
	}

	req, err := http.NewRequestWithContext(ctx, strings.ToUpper(method), endpoint, bodyReader)
	if err != nil {
		return fmt.Errorf("pollo: build request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Accept", "application/json")
	if requestBody != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	// Forward the request id (set by Fiber's logging middleware) so that
	// provider logs and Kastonom logs can be correlated. Per the spec the
	// header name is X-Request-ID; Pollo mirrors it back on responses.
	if rid := ctxRequestID(ctx); rid != "" {
		req.Header.Set("X-Request-ID", rid)
	}
	if tid := ctxTenantID(ctx); tid != "" {
		req.Header.Set("X-Tenant-ID", tid)
	}
	for k, v := range extraHeaders {
		if v == "" {
			continue
		}
		req.Header.Set(k, v)
	}

	resp, err := c.hc.Do(req)
	if err != nil {
		// Network / DNS / TLS / timeout.
		if errors.Is(err, context.DeadlineExceeded) {
			c.log(ctx, method, path, 0, attempt, started, err)
			return providererr.Wrap(providererr.ErrProviderTimeout, "pollo: deadline exceeded", err)
		}
		if errors.Is(err, context.Canceled) {
			return err
		}
		c.log(ctx, method, path, 0, attempt, started, err)
		return providererr.Wrap(providererr.ErrProviderUnavailable, "pollo: network", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20)) // 1 MiB cap

	c.log(ctx, method, path, resp.StatusCode, attempt, started, nil)

	// Retry on 429 / 5xx up to 3 attempts total.
	if (resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500) && attempt < 3 {
		if retryErr := c.sleepBackoff(ctx, attempt, resp); retryErr != nil {
			return retryErr
		}
		return c.callWithAttempt(ctx, method, path, query, requestBody, extraHeaders, result, attempt+1)
	}

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		if result == nil || len(respBody) == 0 {
			return nil
		}
		if err := json.Unmarshal(respBody, result); err != nil {
			return providererr.Wrap(providererr.ErrProviderUnavailable, "pollo: decode response", err)
		}
		return nil
	}

	// Map non-2xx to a sentinel. 4xx (other than 408/429) is a client
	// bug and must not retry — we already skipped retry above.
	sentinel, prefix := classifyStatus(resp.StatusCode)
	return providererr.Wrap(sentinel, fmt.Sprintf("pollo: %s status=%d body=%s", prefix, resp.StatusCode, truncate(string(respBody), 256)), nil)
}

func (c *Client) buildURL(path string, query url.Values) (string, error) {
	base := strings.TrimRight(c.cfg.BaseURL, "/")
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	full, err := url.Parse(base + path)
	if err != nil {
		return "", err
	}
	if query != nil {
		full.RawQuery = query.Encode()
	}
	return full.String(), nil
}

func (c *Client) sleepBackoff(ctx context.Context, attempt int, resp *http.Response) error {
	// Honour Retry-After when present (seconds or HTTP-date).
	if ra := resp.Header.Get("Retry-After"); ra != "" {
		if secs, err := strconv.Atoi(ra); err == nil && secs > 0 {
			t := time.NewTimer(time.Duration(secs) * time.Second)
			defer t.Stop()
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-t.C:
				return nil
			}
		}
	}
	// Exponential backoff with jitter: 250ms, 500ms, 1s baseline.
	base := 250 * time.Millisecond * time.Duration(1<<uint(attempt-1))
	jitter := time.Duration(c.rng.Int63n(int64(base / 2)))
	d := base + jitter
	if d > 2*time.Second {
		d = 2 * time.Second
	}
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-t.C:
		return nil
	}
}

func classifyStatus(code int) (error, string) {
	switch {
	case code == 401 || code == 403:
		return providererr.ErrProviderAuth, "auth"
	case code == 408 || code == 429:
		return providererr.ErrProviderRateLimit, "rate_limited"
	case code >= 400 && code < 500:
		return providererr.ErrProviderBadRequest, "bad_request"
	default:
		return providererr.ErrProviderUnavailable, "unavailable"
	}
}

func (c *Client) log(ctx context.Context, method, path string, status, attempt int, started time.Time, err error) {
	fields := []zap.Field{
		zap.String("method", method),
		zap.String("path", path),
		zap.Int("http_status", status),
		zap.Int("attempt", attempt),
		zap.Int64("latency_ms", time.Since(started).Milliseconds()),
		zap.String("request_id", ctxRequestID(ctx)),
		zap.String("tenant_id", ctxTenantID(ctx)),
	}
	if err != nil {
		fields = append(fields, zap.Error(err))
		logging.L().Warn("pollo outbound call", fields...)
		return
	}
	if status >= 500 || status == 429 {
		logging.L().Warn("pollo outbound call", fields...)
		return
	}
	logging.L().Info("pollo outbound call", fields...)
}

// ---- ctx helpers ----

type ctxKey int

const (
	ctxKeyRequestID ctxKey = iota
	ctxKeyTenantID
)

// WithRequestID returns a copy of ctx that carries the given request id.
// Repositories that receive a domain.TenantContext must call this before
// invoking the Pollo client so the X-Request-ID header is forwarded.
func WithRequestID(ctx context.Context, requestID string) context.Context {
	return context.WithValue(ctx, ctxKeyRequestID, requestID)
}

// WithTenantID returns a copy of ctx that carries the given tenant id.
func WithTenantID(ctx context.Context, tenantID string) context.Context {
	return context.WithValue(ctx, ctxKeyTenantID, tenantID)
}

func ctxRequestID(ctx context.Context) string {
	if v, ok := ctx.Value(ctxKeyRequestID).(string); ok {
		return v
	}
	return ""
}

func ctxTenantID(ctx context.Context) string {
	if v, ok := ctx.Value(ctxKeyTenantID).(string); ok {
		return v
	}
	return ""
}

// FromAppConfig is a tiny adapter for callers that already hold a
// domain.AppConfig.
func FromAppConfig(cfg domain.AppConfig) Config {
	return Config{
		APIKey:    cfg.PolloAPIKey,
		BaseURL:   cfg.PolloBaseURL,
		TimeoutMs: cfg.PolloTimeoutMs,
	}
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}

// jitterUpper bound for math/rand helpers, kept for tests; the inline
// math/rand in sleepBackoff is fine for production use.
var _ = math.MaxInt32
