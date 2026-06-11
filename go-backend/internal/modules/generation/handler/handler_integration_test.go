// Package handler — integration tests for the generation-requests module.
//
//   - POST /generation-requests
//   - POST /generation-requests/estimate-cost
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
	t.Skip("NewTestApp not yet implemented; reconciler will add (signature: func NewTestApp(db *sqlx.DB) (*fiber.App, error)). Generation requires DB + Pollo — covered by skipped stub.")
	return nil
}

// TestGeneration_Create_ResponseShape asserts:
//
//	POST /generation-requests
//	- 202, application/json
//	- body: { generation_request, prompt_payload, video_job, provider_result|null, generated_videos[], fallback_reason: string|null }
func TestIntegration_TestGeneration_Create_ResponseShape(t *testing.T) {
	app := newTestAppOrSkip(t)
	payload := `{
	  "project_id": "00000000-0000-0000-0000-000000000000",
	  "source_asset_ids": [],
	  "objective": "awareness",
	  "platform": "meta_ads",
	  "duration_seconds": 15,
	  "aspect_ratio": "16:9",
	  "language": "en"
	}`
	req, _ := http.NewRequest("POST", "/generation-requests", bytes.NewReader([]byte(payload)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-tenant-id", "test-tenant")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test(create): %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != fiber.StatusAccepted {
		t.Fatalf("status: want 202, got %d", resp.StatusCode)
	}
	raw, _ := io.ReadAll(resp.Body)
	var out map[string]interface{}
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("create body not JSON: %v\nraw=%s", err, string(raw))
	}
	for _, key := range []string{
		"generation_request", "prompt_payload", "video_job",
		"provider_result", "generated_videos", "fallback_reason",
	} {
		if _, ok := out[key]; !ok {
			t.Errorf("create body missing %q", key)
		}
	}
}

// TestGeneration_EstimateCost_ResponseShape asserts:
//
//	POST /generation-requests/estimate-cost
//	- 200, application/json
//	- body: { estimated_credits, estimated_cost: { amount, currency, max_amount } }
func TestIntegration_TestGeneration_EstimateCost_ResponseShape(t *testing.T) {
	app := newTestAppOrSkip(t)
	payload := `{"platform":"meta_ads","duration_seconds":15,"aspect_ratio":"16:9"}`
	req, _ := http.NewRequest("POST", "/generation-requests/estimate-cost", bytes.NewReader([]byte(payload)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-tenant-id", "test-tenant")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test(estimate): %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("status: want 200, got %d", resp.StatusCode)
	}
	raw, _ := io.ReadAll(resp.Body)
	var out map[string]interface{}
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("estimate body not JSON: %v\nraw=%s", err, string(raw))
	}
	if _, ok := out["estimated_credits"]; !ok {
		t.Errorf("estimate body missing estimated_credits")
	}
	cost, ok := out["estimated_cost"].(map[string]interface{})
	if !ok {
		t.Errorf("estimate body missing estimated_cost object")
	} else {
		for _, key := range []string{"amount", "currency", "max_amount"} {
			if _, ok := cost[key]; !ok {
				t.Errorf("estimated_cost missing %q", key)
			}
		}
	}
}
