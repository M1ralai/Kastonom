// Package providererr defines sentinel errors shared by all outbound provider
// HTTP clients (Pollo, Kling, Meta Ads, Google Ads, ...). Wrapping with these
// sentinels lets the service layer translate to domain errors / HTTP responses
// uniformly via errors.Is.
package providererr

import (
	"errors"
	"fmt"
)

// Wrap returns an error that wraps the given sentinel and the underlying
// cause, preserving both for errors.Is and errors.As. The format string is
// used to render the message; include a "pollo:" / "kling:" prefix to keep
// logs greppable.
//
// Example:
//
//	if err != nil {
//	    return providererr.Wrap(providererr.ErrPolloUnavailable,
//	        fmt.Sprintf("pollo: POST /v1/videos (status=%d)", status), err)
//	}
func Wrap(sentinel error, format string, cause error) error {
	if cause == nil {
		return fmt.Errorf("%s: %w", format, sentinel)
	}
	return fmt.Errorf("%s: %w: %w", format, sentinel, cause)
}

// CategoryFor maps an HTTP status to the matching sentinel. Use this when
// the provider client has already classified the response but wants to wrap
// with the conventional sentinel + chain the underlying transport error.
//
// Special cases:
//   - 408 (Request Timeout) is treated as ErrProviderTimeout, not BadRequest.
//   - 429 is ErrProviderRateLimit; the caller may have already retried.
func CategoryFor(status int) error {
	switch {
	case status == 401 || status == 403:
		return ErrProviderAuth
	case status == 408:
		return ErrProviderTimeout
	case status == 429:
		return ErrProviderRateLimit
	case status >= 400 && status < 500:
		return ErrProviderBadRequest
	case status >= 500:
		return ErrProviderUnavailable
	default:
		return nil
	}
}

// IsAny is a small convenience that returns true if err matches any of the
// given sentinels. Useful for "is this a retryable provider failure" checks
// that span Unavailable / RateLimit / Timeout.
func IsAny(err error, sentinels ...error) bool {
	for _, s := range sentinels {
		if errors.Is(err, s) {
			return true
		}
	}
	return false
}

// ErrPollo* and the short ErrUnavailable / ErrAuth / ErrRateLimit /
// ErrBadRequest / ErrTimeout aliases are declared in errors.go alongside the
// canonical ErrProvider* sentinels. See that file for the canonical
// definitions.
