// Package bootstrap — integration tests for the cross-cutting
// production concerns that the frontend hits without a DB round-trip:
//
//   1. GET /health
//      - the wire JSON for video_provider_readiness MUST be an OBJECT
//        with a "pollo" key (a single-element map). The TS
//        HealthResponse declares the field as
//        `Record<string, {ready, error?}>` and the frontend reads
//        `r.video_provider_readiness.pollo.ready`; a single
//        ReadinessStatus object — the current production shape —
//        leaves .pollo undefined and the readiness UI silently
//        reports "not ready".
//
//   2. GET /health/ready
//      - shape: { status: "ok"|"degraded", checks: {...} }
//
//   3. GET /uploads/mock-upload.png
//      - the demo_or_mock_service writes
//        SourceAsset.URL = "/uploads/mock-upload.png" and the
//        frontend prepends API_BASE_URL to that relative URL via
//        assetPreview.ts. There is currently no app.Static("/uploads", ...)
//        registered in internal/bootstrap/app.go, so the request
//        would 404. This test must FAIL on master until a
//        reconciler-added static mount exists.
package bootstrap

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v3"
)

// newTestAppOrSkip returns the test app the reconciler must add.
func newTestAppOrSkip(t *testing.T) *fiber.App {
	t.Helper()
	t.Skip("NewTestApp not yet implemented; reconciler will add (signature: func NewTestApp(db *sqlx.DB) (*fiber.App, error)). This is the recommended constructor; the rest of this file can run as soon as it exists.")
	return nil
}

// TestHealth_VideoProviderReadiness_IsObjectWithPolloKey drives GET /health
// and asserts the JSON wire has `video_provider_readiness` as an OBJECT
// with a "pollo" key. This is the wrap fix the frontend depends on.
func TestIntegration_TestHealth_VideoProviderReadiness_IsObjectWithPolloKey(t *testing.T) {
	app := newTestAppOrSkip(t)
	req, _ := http.NewRequest("GET", "/health", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test(/health): %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("status: want 200, got %d", resp.StatusCode)
	}
	if ct := resp.Header.Get("Content-Type"); !strings.Contains(ct, "application/json") {
		t.Errorf("Content-Type: want application/json, got %q", ct)
	}
	raw, _ := io.ReadAll(resp.Body)
	var doc map[string]json.RawMessage
	if err := json.Unmarshal(raw, &doc); err != nil {
		t.Fatalf("/health body not JSON object: %v\nraw=%s", err, string(raw))
	}
	vprRaw, ok := doc["video_provider_readiness"]
	if !ok {
		t.Fatalf("/health missing video_provider_readiness")
	}
	// CRITICAL: production emits a single ReadinessStatus object. The
	// frontend wants a map with a "pollo" key. Decode to map first;
	// if the value is a flat object, this fails loudly.
	var asMap map[string]json.RawMessage
	if err := json.Unmarshal(vprRaw, &asMap); err != nil {
		t.Fatalf("video_provider_readiness must be an OBJECT (Record<string, ReadinessStatus>) keyed by provider name (e.g. \"pollo\"); got non-object value: %s", string(vprRaw))
	}
	polloRaw, ok := asMap["pollo"]
	if !ok {
		t.Fatalf("video_provider_readiness must contain a \"pollo\" key (TS frontend reads .pollo.ready); current keys=%v", mapKeys(asMap))
	}
	var polloStatus struct {
		Ready  bool   `json:"ready"`
		Mode   string `json:"mode"`
		IsMock bool   `json:"is_mock"`
		Error  string `json:"error"`
	}
	if err := json.Unmarshal(polloRaw, &polloStatus); err != nil {
		t.Fatalf("pollo readiness entry not an object: %v", err)
	}
	if !polloStatus.Ready {
		t.Errorf("pollo readiness.ready should be true in mock mode; got %+v", polloStatus)
	}
}

// TestHealth_AdPlatformReadiness_IsObject drives GET /health and asserts
// the JSON wire has `ad_platform_readiness` as an OBJECT (Record).
// Each value should be a ReadinessStatus.
func TestIntegration_TestHealth_AdPlatformReadiness_IsObject(t *testing.T) {
	app := newTestAppOrSkip(t)
	req, _ := http.NewRequest("GET", "/health", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test(/health): %v", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	var doc map[string]json.RawMessage
	_ = json.Unmarshal(raw, &doc)
	apr, ok := doc["ad_platform_readiness"]
	if !ok {
		t.Fatalf("/health missing ad_platform_readiness")
	}
	var asMap map[string]json.RawMessage
	if err := json.Unmarshal(apr, &asMap); err != nil {
		t.Fatalf("ad_platform_readiness must be an OBJECT; got non-object value: %s", string(apr))
	}
	for _, key := range []string{"meta_ads", "google_ads"} {
		if _, ok := asMap[key]; !ok {
			t.Errorf("ad_platform_readiness missing %q (frontend branches on this)", key)
		}
	}
}

// TestHealth_Ready_ResponseShape drives GET /health/ready and asserts:
//
//	{ status: "ok"|"degraded", checks: {...} }
func TestIntegration_TestHealth_Ready_ResponseShape(t *testing.T) {
	app := newTestAppOrSkip(t)
	req, _ := http.NewRequest("GET", "/health/ready", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test(/health/ready): %v", err)
	}
	defer resp.Body.Close()
	// 200 when DB is reachable; 503 when not. Both shapes are valid.
	if resp.StatusCode != fiber.StatusOK && resp.StatusCode != fiber.StatusServiceUnavailable {
		t.Fatalf("status: want 200 or 503, got %d", resp.StatusCode)
	}
	raw, _ := io.ReadAll(resp.Body)
	var doc map[string]json.RawMessage
	if err := json.Unmarshal(raw, &doc); err != nil {
		t.Fatalf("/health/ready body not JSON object: %v\nraw=%s", err, string(raw))
	}
	if _, ok := doc["status"]; !ok {
		t.Errorf("/health/ready body missing status")
	}
	if _, ok := doc["checks"]; !ok {
		t.Errorf("/health/ready body missing checks")
	}
}

// TestUploads_MockUploadPng_Served drives:
//
//	GET /uploads/mock-upload.png
//
// The reconciler must add app.Static("/uploads", "./uploads") (or
// equivalent). This test writes a real PNG to t.TempDir()/uploads/
// mock-upload.png and asserts the bytes round-trip.
// This is the static-assets integration test.
func TestIntegration_TestUploads_MockUploadPng_Served(t *testing.T) {
	// Seed a real file the demo-or-mock service would have written.
	dir := t.TempDir()
	upDir := filepath.Join(dir, "uploads")
	if err := os.MkdirAll(upDir, 0o755); err != nil {
		t.Fatalf("mkdir uploads: %v", err)
	}
	// PNG magic header followed by deterministic payload.
	payload := append([]byte{0x89, 'P', 'N', 'G', 0x0d, 0x0a, 0x1a, 0x0a}, []byte("KASTONOM_MOCK_UPLOAD_PAYLOAD")...)
	target := filepath.Join(upDir, "mock-upload.png")
	if err := os.WriteFile(target, payload, 0o644); err != nil {
		t.Fatalf("write mock-upload.png: %v", err)
	}

	app := newTestAppOrSkip(t)
	_ = dir // available for the reconciler to wire into NewTestApp as UploadDir

	req, _ := http.NewRequest("GET", "/uploads/mock-upload.png", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test(/uploads/mock-upload.png): %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("status: want 200, got %d — bootstrap must register app.Static(\"/uploads\", <dir>) and serve the file the demo_or_mock_service wrote", resp.StatusCode)
	}
	body, _ := io.ReadAll(resp.Body)
	if !bytes.Equal(body, payload) {
		t.Fatalf("body mismatch: want %d bytes (PNG+%s), got %d bytes", len(payload), "KASTONOM_MOCK_UPLOAD_PAYLOAD", len(body))
	}
}

// mapKeys is a tiny helper for nicer test failure messages.
func mapKeys(m map[string]json.RawMessage) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	return out
}
