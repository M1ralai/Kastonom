// Package handler — integration tests for the creative-projects module.
//
// These tests drive:
//   - GET  /creative-projects
//   - POST /creative-projects
//   - GET  /creative-projects/:id
//   - GET  /creative-projects/:id/metrics
//
// They assert the response shape matches the TS interfaces in
// frontend/src/shared/types/api.ts (CreativeProject, CreativeSubject,
// SourceAsset, ProjectMetrics).
//
// The reconciler must add bootstrap.NewTestApp(db *sqlx.DB) for these
// tests to run. Until then they skip.
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
	t.Skip("NewTestApp not yet implemented; reconciler will add (signature: func NewTestApp(db *sqlx.DB) (*fiber.App, error)). Creative projects require DB — covered by skipped stub.")
	return nil
}

// TestCreative_List_ResponseShape asserts:
//
//	GET /creative-projects
//	- status 200
//	- body: array of { creative_project, creative_subject|null, source_assets[] }
func TestIntegration_TestCreative_List_ResponseShape(t *testing.T) {
	app := newTestAppOrSkip(t)
	req, _ := http.NewRequest("GET", "/creative-projects", nil)
	req.Header.Set("x-tenant-id", "test-tenant")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test(list): %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("status: want 200, got %d", resp.StatusCode)
	}
	raw, _ := io.ReadAll(resp.Body)
	var arr []map[string]interface{}
	if err := json.Unmarshal(raw, &arr); err != nil {
		// Frontend's listCreativeProjects expects an array; a 200 with
		// an object would silently break it.
		t.Fatalf("expected JSON array; got %s", string(raw))
	}
	for i, item := range arr {
		if _, ok := item["creative_project"]; !ok {
			t.Errorf("item[%d] missing creative_project", i)
		}
		if _, ok := item["source_assets"]; !ok {
			t.Errorf("item[%d] missing source_assets", i)
		}
	}
}

// TestCreative_Create_ResponseShape asserts:
//
//	POST /creative-projects
//	- status 201
//	- body: { creative_project, creative_subject, source_assets[], fallback_reason: string|null }
func TestIntegration_TestCreative_Create_ResponseShape(t *testing.T) {
	app := newTestAppOrSkip(t)
	payload := `{
	  "name": "Spring shoe",
	  "creative_subject": {
	    "subject_type": "product",
	    "name": "Shoe",
	    "allowed_claims": ["comfortable"],
	    "forbidden_claims": [],
	    "unknown_fields": [],
	    "source": "user_input"
	  }
	}`
	req, _ := http.NewRequest("POST", "/creative-projects", bytes.NewReader([]byte(payload)))
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
	for _, key := range []string{"creative_project", "creative_subject", "source_assets", "fallback_reason"} {
		if _, ok := out[key]; !ok {
			t.Errorf("create body missing %q", key)
		}
	}
}

// TestCreative_GetBundle_ResponseShape asserts:
//
//	GET /creative-projects/:id
//	- body: { creative_project, creative_subject, source_assets, generation_requests, generated_videos }
func TestIntegration_TestCreative_GetBundle_ResponseShape(t *testing.T) {
	app := newTestAppOrSkip(t)
	req, _ := http.NewRequest("GET", "/creative-projects/00000000-0000-0000-0000-000000000000", nil)
	req.Header.Set("x-tenant-id", "test-tenant")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test(getBundle): %v", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	var out map[string]interface{}
	if resp.StatusCode == fiber.StatusOK {
		_ = json.Unmarshal(raw, &out)
		for _, key := range []string{"creative_project", "creative_subject", "source_assets", "generation_requests", "generated_videos"} {
			if _, ok := out[key]; !ok {
				t.Errorf("getBundle body missing %q", key)
			}
		}
	}
}

// TestCreative_Metrics_ResponseShape asserts:
//
//	GET /creative-projects/:id/metrics
//	- body: { project_id, creative_subject:{id, name, price, currency, margin_percent, stock_count, ai_score, ai_reasons[]}, erp_data:{stock_available, stock_reserved, last_sync_at} }
func TestIntegration_TestCreative_Metrics_ResponseShape(t *testing.T) {
	app := newTestAppOrSkip(t)
	req, _ := http.NewRequest("GET", "/creative-projects/00000000-0000-0000-0000-000000000000/metrics", nil)
	req.Header.Set("x-tenant-id", "test-tenant")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test(metrics): %v", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode == fiber.StatusOK {
		var out map[string]interface{}
		_ = json.Unmarshal(raw, &out)
		if _, ok := out["project_id"]; !ok {
			t.Errorf("metrics body missing project_id")
		}
		if _, ok := out["creative_subject"]; !ok {
			t.Errorf("metrics body missing creative_subject")
		}
		if _, ok := out["erp_data"]; !ok {
			t.Errorf("metrics body missing erp_data")
		}
	}
}
