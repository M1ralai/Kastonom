package pollo

import (
	"context"
	"errors"
)

// errProviderDisabled is returned when SuggestIterations is called on a
// client constructed without an API key. Callers can errors.Is it to
// detect the disabled state without coupling to a nil check.
var errProviderDisabled = errors.New("pollo: client disabled (POLLO_API_KEY not set)")

// Iteration-suggestions DTOs for POST /v1/insights/iterations/suggest.
//
// These DTOs are intentionally scoped to the Pollo provider package and are
// not reused by the iteration module's own request/response types. The
// module's `dto.CreateIterationSuggestionRequest` carries Kastonom's
// public contract; the struct here carries the wire format Pollo expects
// for the LLM call.
//
// Request mirrors the spec from the Pollo API docs: given a metrics
// snapshot ID and a generated video ID, the model returns a ranked list
// of suggested creative changes with a confidence score and an overall
// priority for the suggestion.

// IterationSuggestRequest is the wire body posted to Pollo.
type IterationSuggestRequest struct {
	// TenantID is forwarded so the LLM can scope guardrails per tenant.
	TenantID string `json:"tenant_id"`
	// ProjectID ties the suggestion back to the Kastonom creative project.
	ProjectID string `json:"project_id"`
	// GeneratedVideoID is the video the suggestion is for.
	GeneratedVideoID string `json:"generated_video_id"`
	// AdMetricsSnapshotID is the metrics snapshot driving the suggestion.
	// Optional: nil means "use the latest snapshot for this project".
	AdMetricsSnapshotID *string `json:"ad_metrics_snapshot_id,omitempty"`
	// Reason is the user-supplied hint ("CTR dropped", "skip rate high", ...).
	Reason string `json:"reason"`
}

// IterationSuggestedChange is one ranked creative change returned by Pollo.
type IterationSuggestedChange struct {
	// Text is the human-readable suggestion ("shorten opening hook", ...).
	Text string `json:"text"`
	// Priority orders the list. Higher = apply first.
	Priority int `json:"priority"`
	// Rationale is optional, model-generated explanation of why this
	// change should help given the metrics snapshot.
	Rationale string `json:"rationale,omitempty"`
}

// IterationSuggestResponse is the typed response of the iterations/suggest
// endpoint. We intentionally keep the surface small; the iteration module
// only consumes the ranked changes + overall confidence.
type IterationSuggestResponse struct {
	// Changes is the ranked list of creative changes.
	Changes []IterationSuggestedChange `json:"changes"`
	// Confidence is the model's overall confidence: "low" | "medium" | "high".
	Confidence string `json:"confidence"`
	// ProviderJobID is Pollo's correlation id (echoed in logs).
	ProviderJobID string `json:"provider_job_id,omitempty"`
}

// IterationSuggestPath is the canonical endpoint path for the
// iterations-suggest LLM call. Kept as a constant so other packages can
// reference it without re-typing the route.
const IterationSuggestPath = "/v1/insights/iterations/suggest"

// SuggestIterations posts an iteration-suggest request to Pollo. When the
// client is not enabled (no API key configured) it returns
// (IterationSuggestResponse{}, errProviderDisabled) so the caller can
// fall back to the demo/mock helpers without a separate nil check.
func (c *Client) SuggestIterations(ctx context.Context, in IterationSuggestRequest) (IterationSuggestResponse, error) {
	if !c.Enabled() {
		return IterationSuggestResponse{}, errProviderDisabled
	}
	var out IterationSuggestResponse
	if err := c.Call(ctx, "POST", IterationSuggestPath, nil, in, &out); err != nil {
		// Errors from Call are already providererr-wrapped; do not double-wrap.
		return IterationSuggestResponse{}, err
	}
	return out, nil
}

// IsProviderDisabled reports whether err indicates a missing API key. The
// service layer uses this to decide whether to fall through to the mock
// helpers instead of surfacing a 5xx.
func IsProviderDisabled(err error) bool {
	return errors.Is(err, errProviderDisabled)
}
