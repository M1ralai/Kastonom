// Package health implements the readiness probe for the /health endpoint.
//
// The probe performs a real Pollo auth-key ping and a transport-level
// reachability check for the configured ad platforms (Meta Ads, Google
// Ads). When KASTONOM_MODE=mock the probe short-circuits to "ready,
// is_mock=true" for every component so local development and CI keep
// working without outbound network access.
//
// Errors are wrapped with fmt.Errorf("...: %w", err) so callers can use
// errors.Is / errors.As. The probe never logs POLLO_API_KEY or any
// other secret; only the existence of missing fields is recorded.
package health

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/provider/pollo"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/logging"
	"github.com/M1ralai/Kastonom/backend/internal/shared/providererr"
	"go.uber.org/zap"
)

// ModeMock is the value of KASTONOM_MODE that forces the probe to
// short-circuit to ready=true, is_mock=true for every component.
const ModeMock = "mock"

// Probe performs the readiness checks. Construct it once at boot and
// reuse it (the underlying *http.Client maintains a connection pool).
// The Probe is safe for concurrent use: Check issues its own sub-context
// per call.
type Probe struct {
	cfg   domain.AppConfig
	pollo *pollo.Client
	httpc *http.Client
	// adProbes lists the per-platform reachability checks. Built once at
	// construction from cfg so Check does not allocate.
	adProbes map[string]adProbe
}

type adProbe struct {
	BaseURL    string
	AccountID  string
	AccessTok  string
	HealthPath string // e.g. "/v18.0/me" for Meta
}

// New builds a Probe from the given app config. The Pollo client is
// constructed here (single instance per process) so that one connection
// pool is shared across modules. If cfg.PolloBaseURL is empty the
// default https://pollo.ai is used; if cfg.PolloTimeoutMs <= 0 a 30s
// default is used.
func New(cfg domain.AppConfig) *Probe {
	p := &Probe{
		cfg: cfg,
		// Reuse the shared single-instance Pollo client. The constructor
		// in internal/provider/pollo is idempotent; calling it here means
		// /health has its own pool sized to the probe's needs, but in
		// practice the bootstrap can pass the same instance in (see
		// NewWithPollo). Either way Enabled() is based on API key only.
		pollo: pollo.NewClient(pollo.FromAppConfig(cfg)),
		httpc: &http.Client{
			Timeout: 5 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        20,
				MaxIdleConnsPerHost: 4,
				IdleConnTimeout:     30 * time.Second,
			},
		},
	}
	p.adProbes = map[string]adProbe{
		"meta_ads": {
			BaseURL:    firstNonEmpty(cfg.MetaAdsBaseURL, "https://graph.facebook.com"),
			AccountID:  cfg.MetaAdsAccountID,
			AccessTok:  cfg.MetaAdsAccessToken,
			HealthPath: "/v18.0/me",
		},
		"google_ads": {
			BaseURL:    firstNonEmpty(cfg.GoogleAdsBaseURL, "https://googleads.googleapis.com"),
			AccountID:  cfg.GoogleAdsAccountID,
			AccessTok:  cfg.GoogleAdsDeveloperToken,
			HealthPath: "/v17/customers/" + cfg.GoogleAdsAccountID,
		},
	}
	return p
}

// NewWithPollo builds a Probe that reuses a pre-constructed Pollo
// client (e.g. the same one wired into the iteration / generation
// modules). This avoids the second connection pool that New() would
// create and is the preferred constructor for the bootstrap.
func NewWithPollo(cfg domain.AppConfig, client *pollo.Client) *Probe {
	p := New(cfg)
	if client != nil {
		p.pollo = client
	}
	return p
}

// Report is the shape returned by /health. The JSON shape matches the
// legacy mock response so existing dashboards do not break; the only
// addition is the "missing" / "error" fields on ReadinessStatus so
// operators can see WHY a component is not ready.
type Report struct {
	Status              string                            `json:"status"`
	Mode                string                            `json:"mode"`
	Version             string                            `json:"version"`
	VideoProviderReady  map[string]domain.ReadinessStatus `json:"video_provider_readiness"`
	AdPlatformReadiness map[string]domain.ReadinessStatus `json:"ad_platform_readiness"`
}

// Check runs every readiness probe. The returned Report is safe to
// JSON-encode directly. ctx bounds the total wall-clock time of the
// probe; each individual check inherits a derived timeout.
func (p *Probe) Check(ctx context.Context) Report {
	r := Report{
		Status:              "ok",
		Mode:                p.cfg.Mode,
		Version:             p.cfg.Version,
		AdPlatformReadiness: map[string]domain.ReadinessStatus{},
	}

	// KASTONOM_MODE=mock short-circuits to "ready, is_mock=true" for
	// every component. This preserves the existing demo/offline contract.
	if p.cfg.Mode == ModeMock {
		r.VideoProviderReady = map[string]domain.ReadinessStatus{
			"pollo": {
				Ready:  true,
				Mode:   p.cfg.Mode,
				IsMock: true,
			},
		}
		for name := range p.adProbes {
			r.AdPlatformReadiness[name] = domain.ReadinessStatus{
				Ready:  true,
				Mode:   p.cfg.Mode,
				IsMock: true,
			}
		}
		return r
	}

	// Real Pollo auth ping.
	if err := p.pollo.Ping(ctx); err != nil {
		r.VideoProviderReady = map[string]domain.ReadinessStatus{
			"pollo": mapPolloError(err, p.cfg.Mode),
		}
	} else {
		r.VideoProviderReady = map[string]domain.ReadinessStatus{
			"pollo": {
				Ready: true,
				Mode:  p.cfg.Mode,
			},
		}
	}

	// Real ad-platform reachability.
	for name, ap := range p.adProbes {
		r.AdPlatformReadiness[name] = p.checkAdPlatform(ctx, name, ap)
	}

	for _, v := range r.VideoProviderReady {
		if !v.Ready {
			r.Status = "degraded"
			break
		}
	}
	for _, ad := range r.AdPlatformReadiness {
		if !ad.Ready {
			r.Status = "degraded"
			break
		}
	}
	return r
}

// checkAdPlatform performs a transport-level reachability check for one
// ad platform. It never returns an error: the result is encoded into a
// ReadinessStatus (with Missing + Error populated when appropriate) so
// the caller can serialize the Report directly.
func (p *Probe) checkAdPlatform(ctx context.Context, name string, ap adProbe) domain.ReadinessStatus {
	st := domain.ReadinessStatus{Mode: p.cfg.Mode}
	var missing []string
	if ap.AccountID == "" {
		missing = append(missing, accountEnvName(name))
	}
	if ap.AccessTok == "" {
		missing = append(missing, tokenEnvName(name))
	}
	if len(missing) > 0 {
		st.Missing = missing
		st.Ready = false
		st.Error = fmt.Sprintf("missing credentials: %v", missing)
		logging.L().Info("health: ad platform missing creds",
			zap.String("platform", name),
			zap.Strings("missing", missing),
		)
		return st
	}

	// Transport-level check. We hit the platform's well-known "list me"
	// endpoint. Any HTTP response (even 4xx) is considered reachable —
	// the auth failure will be classified as ErrProviderAuth.
	probeCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	url := ap.BaseURL + ap.HealthPath
	req, err := http.NewRequestWithContext(probeCtx, http.MethodGet, url, nil)
	if err != nil {
		st.Ready = false
		st.Error = fmt.Sprintf("build request: %v", err)
		logging.L().Warn("health: ad platform request build failed",
			zap.String("platform", name),
			zap.Error(err),
		)
		return st
	}
	// Token is forwarded as a query param for Meta and as a header for
	// Google Ads; both platforms accept both forms but this is the
	// documented one.
	if name == "meta_ads" {
		q := req.URL.Query()
		q.Set("access_token", ap.AccessTok)
		q.Set("fields", "id,name")
		req.URL.RawQuery = q.Encode()
	} else if name == "google_ads" {
		req.Header.Set("developer-token", ap.AccessTok)
	}

	resp, err := p.httpc.Do(req)
	if err != nil {
		st.Ready = false
		st.Error = fmt.Sprintf("unreachable: %v", err)
		logging.L().Warn("health: ad platform unreachable",
			zap.String("platform", name),
			zap.Error(err),
		)
		return st
	}
	defer resp.Body.Close()
	// Drain body to allow connection reuse; cap at 8 KiB to avoid OOM.
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 8<<10))

	switch {
	case resp.StatusCode >= 200 && resp.StatusCode < 300:
		st.Ready = true
	case resp.StatusCode == 401 || resp.StatusCode == 403:
		st.Ready = false
		st.Error = fmt.Sprintf("auth rejected (status=%d)", resp.StatusCode)
		logging.L().Warn("health: ad platform auth rejected",
			zap.String("platform", name),
			zap.Int("status", resp.StatusCode),
		)
	default:
		// 4xx/5xx: still reachable, treat as not ready.
		st.Ready = false
		// Try to extract a "message" field from the response for
		// operator-friendly diagnostics. Best-effort: a non-JSON body
		// is ignored.
		var pe struct {
			Message string `json:"message"`
			Error   struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4<<10))
		_ = json.Unmarshal(body, &pe)
		msg := pe.Message
		if msg == "" {
			msg = pe.Error.Message
		}
		if msg == "" {
			msg = fmt.Sprintf("status=%d", resp.StatusCode)
		}
		st.Error = msg
		logging.L().Warn("health: ad platform not ready",
			zap.String("platform", name),
			zap.Int("status", resp.StatusCode),
			zap.String("provider_message", msg),
		)
	}
	return st
}

// mapPolloError converts a Pollo Ping error into a ReadinessStatus with
// the appropriate Missing / Error fields. The function never panics on
// a nil error.
func mapPolloError(err error, mode string) domain.ReadinessStatus {
	st := domain.ReadinessStatus{Mode: mode, Ready: false}
	if err == nil {
		st.Ready = true
		return st
	}
	// Auth missing -> not ready, list the missing env var.
	if errors.Is(err, providererr.ErrPolloAuth) {
		st.Missing = []string{"POLLO_API_KEY"}
		st.Error = "POLLO_API_KEY is not configured or rejected by the provider"
		return st
	}
	// Transient / structural -> not ready, surface the cause.
	switch {
	case errors.Is(err, providererr.ErrPolloUnavailable):
		st.Error = "pollo: provider unavailable"
	case errors.Is(err, providererr.ErrPolloRateLimit):
		st.Error = "pollo: rate limited"
	case errors.Is(err, providererr.ErrPolloTimeout):
		st.Error = "pollo: timeout"
	default:
		st.Error = err.Error()
	}
	return st
}

// firstNonEmpty returns s when non-empty, else fallback. Used for
// defaulting ad-platform base URLs.
func firstNonEmpty(s, fallback string) string {
	if s == "" {
		return fallback
	}
	return s
}

// accountEnvName / tokenEnvName translate the platform key to the env
// var name the operator should set. Exposed as helpers (rather than a
// hard-coded map) so adding a new platform only requires updating this
// function.
func accountEnvName(platform string) string {
	switch platform {
	case "meta_ads":
		return "META_ADS_ACCOUNT_ID"
	case "google_ads":
		return "GOOGLE_ADS_ACCOUNT_ID"
	default:
		return platform + "_ACCOUNT_ID"
	}
}

func tokenEnvName(platform string) string {
	switch platform {
	case "meta_ads":
		return "META_ADS_ACCESS_TOKEN"
	case "google_ads":
		return "GOOGLE_ADS_DEVELOPER_TOKEN"
	default:
		return platform + "_TOKEN"
	}
}
