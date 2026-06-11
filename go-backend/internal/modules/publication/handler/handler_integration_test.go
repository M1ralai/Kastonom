// Package handler — integration tests for the ad-publications module.
//
//   - POST /ad-publications
//   - POST /ad-publications/:id/metrics/sync
package handler

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"github.com/gofiber/fiber/v3"
)

func newTestAppOrSkip(t *testing.T) *fiber.App {
	t.Helper()
	t.Skip("NewTestApp not yet implemented; reconciler will add (signature: func NewTestApp(db *sqlx.DB) (*fiber.App, error)). Publications require DB — covered by skipped stub.")
	return nil
}

// TestPublication_Create_ResponseShape asserts:
//
//	POST /ad-publications
//	- 201, application/json
//	- body: { ad_publication, fallback_reason: string|null }
func TestIntegration_TestPublication_Create_ResponseShape(t *testing.T) {
	app := newTestAppOrSkip(t)
	payload := `{
	  "project_id": "00000000-0000-0000-0000-000000000000",
	  "generated_video_id": "00000000-0000-0000-0000-000000000001",
	  "platform": "meta_ads",
	  "user_confirmed_publish": true
	}`
	req, _ := http.NewRequest("POST", "/ad-publications", bytes.NewReader([]byte(payload)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-tenant-id", "test-tenant")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test(create): %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != fiber.StatusCreated {
		t.Fatalf("status: want 201, got %d", resp.StatusCode)
	}
	raw, _ := io.ReadAll(resp.Body)
	var out map[string]interface{}
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("create body not JSON: %v\nraw=%s", err, string(raw))
	}
	for _, key := range []string{"ad_publication", "fallback_reason"} {
		if _, ok := out[key]; !ok {
			t.Errorf("create body missing %q", key)
		}
	}
}

// TestPublication_SyncMetrics_ResponseShape asserts:
//
//	POST /ad-publications/:id/metrics/sync
//	- 201
//	- body: { metrics_snapshot }
func TestIntegration_TestPublication_SyncMetrics_ResponseShape(t *testing.T) {
	app := newTestAppOrSkip(t)
	payload := `{
	  "source": "mock",
	  "date_start": "2026-06-01",
	  "date_end": "2026-06-07",
	  "metrics": {"impressions": 100, "clicks": 5, "ctr": 0.05}
	}`
	req, _ := http.NewRequest("POST", "/ad-publications/00000000-0000-0000-0000-000000000000/metrics/sync", bytes.NewReader([]byte(payload)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-tenant-id", "test-tenant")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test(sync): %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != fiber.StatusCreated {
		t.Fatalf("status: want 201, got %d", resp.StatusCode)
	}
	raw, _ := io.ReadAll(resp.Body)
	var out map[string]interface{}
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("sync body not JSON: %v\nraw=%s", err, string(raw))
	}
	if _, ok := out["metrics_snapshot"]; !ok {
		t.Errorf("sync body missing metrics_snapshot")
	}
}
