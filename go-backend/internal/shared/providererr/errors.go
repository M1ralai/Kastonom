// Package providererr defines sentinel errors shared by all external provider
// integrations (Pollo, Kling, Meta, Google Ads, ...). Wrapping with these
// sentinels lets the service layer translate provider failures into
// domain errors / httpx responses without hard-coding provider details.
package providererr

import "errors"

// Sentinel errors. Each wraps a lower-level error (from net/http, json, ...)
// via fmt.Errorf("...: %w", err) so callers can errors.Is / errors.As.
//
// Two naming families are exported for ergonomic matching:
//   - Provider-neutral: ErrProvider* (preferred in new code).
//   - Pollo-specific aliases: ErrPollo* (kept for the spec's call sites and
//     for code that needs to assert a specific provider at the call site).
var (
	// ErrProviderUnavailable: transport-level failure (connection refused,
	// DNS failure, EOF, timeout, 5xx after retries).
	ErrProviderUnavailable = errors.New("provider unavailable")

	// ErrProviderAuth: 401/403 from the provider, missing API key,
	// or invalid signature on a webhook.
	ErrProviderAuth = errors.New("provider auth failed")

	// ErrProviderRateLimit: 429 (after backoff exhausts).
	ErrProviderRateLimit = errors.New("provider rate limited")

	// ErrProviderBadRequest: 4xx other than 401/403/408/429.
	ErrProviderBadRequest = errors.New("provider bad request")

	// ErrProviderTimeout: per-attempt deadline exceeded.
	ErrProviderTimeout = errors.New("provider timeout")

	// Pollo-specific aliases. They are the same values as the Provider-*
	// sentinels, so errors.Is(err, ErrPolloUnavailable) and
	// errors.Is(err, ErrProviderUnavailable) both match. This keeps the
	// shared logic provider-neutral while letting call sites that import the
	// Pollo package read like the spec.
	ErrPolloUnavailable = ErrProviderUnavailable
	ErrPolloAuth        = ErrProviderAuth
	ErrPolloRateLimit   = ErrProviderRateLimit
	ErrPolloBadRequest  = ErrProviderBadRequest
	ErrPolloTimeout     = ErrProviderTimeout

	// Short aliases used by the shared httpclient and the existing
	// internal/provider/pollo call sites. Same values as the Provider-*
	// sentinels, kept for shorter, idiomatic call sites.
	ErrUnavailable = ErrProviderUnavailable
	ErrAuth        = ErrProviderAuth
	ErrRateLimit   = ErrProviderRateLimit
	ErrBadRequest  = ErrProviderBadRequest
	ErrTimeout     = ErrProviderTimeout
)
