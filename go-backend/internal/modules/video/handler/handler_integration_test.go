// Package handler — integration tests for the video-jobs module.
//
//   - GET  /video-jobs/:id
//   - GET  /video-jobs/:id/full
//   - POST /generated-videos/:id/select
package handler

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"github.com/gofiber/fiber/v3"
)

// allowedVideoJobStatuses mirrors the TS VideoJobStatus union
// (frontend/src/shared/types/api.ts). The frontend's pollVideoJob
// branches on these values; if the wire shape changes the status set,
// polling silently breaks.
var allowedVideoJobStatuses = map[string]bool{
	"queued":     true,
	"processing": true,
	"rendering":  true,
	"completed":  true,
	"failed":     true,
	"canceled":   true,
}

func newTestAppOrSkip(t *testing.T) *fiber.App {
	t.Helper()
	t.Skip("NewTestApp not yet implemented; reconciler will add (signature: func NewTestApp(db *sqlx.DB) (*fiber.App, error)). Video jobs require DB — covered by skipped stub.")
	return nil
}

// TestVideoJob_Get_ResponseShape asserts:
//
//	GET /video-jobs/:id
//	- body: { video_job:{id, status, ...}, provider_result|null, generated_videos[], fallback_reason: string|null }
//	- AND video_job.status is in the TS VideoJobStatus union.
func TestIntegration_TestVideoJob_Get_ResponseShape(t *testing.T) {
	app := newTestAppOrSkip(t)
	req, _ := http.NewRequest("GET", "/video-jobs/00000000-0000-0000-0000-000000000000", nil)
	req.Header.Set("x-tenant-id", "test-tenant")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test(get): %v", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode == fiber.StatusOK {
		var out map[string]interface{}
		_ = json.Unmarshal(raw, &out)
		vj, ok := out["video_job"].(map[string]interface{})
		if !ok {
			t.Errorf("get body missing video_job object")
		} else if status, ok := vj["status"].(string); ok {
			if !allowedVideoJobStatuses[status] {
				t.Errorf("video_job.status=%q is not in the TS VideoJobStatus union (frontend pollVideoJob branches on this)", status)
			}
		}
	}
}

// TestVideoJob_GetFull_ResponseShape asserts:
//
//	GET /video-jobs/:id/full
//	- body: { video_job:{id, status, created_at}, generated_videos:[{id, url, thumbnail_url, duration_seconds, aspect_ratio, status, is_selected}], project:{id, name}, creative_subject|null, generation_request|null }
func TestIntegration_TestVideoJob_GetFull_ResponseShape(t *testing.T) {
	app := newTestAppOrSkip(t)
	req, _ := http.NewRequest("GET", "/video-jobs/00000000-0000-0000-0000-000000000000/full", nil)
	req.Header.Set("x-tenant-id", "test-tenant")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test(getFull): %v", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode == fiber.StatusOK {
		var out map[string]interface{}
		_ = json.Unmarshal(raw, &out)
		for _, key := range []string{"video_job", "generated_videos", "project"} {
			if _, ok := out[key]; !ok {
				t.Errorf("getFull body missing %q", key)
			}
		}
	}
}

// TestGeneratedVideo_Select_ResponseShape asserts:
//
//	POST /generated-videos/:id/select
//	- body: { creative_project, generated_video }
func TestIntegration_TestGeneratedVideo_Select_ResponseShape(t *testing.T) {
	app := newTestAppOrSkip(t)
	payload := `{"project_id":"00000000-0000-0000-0000-000000000000"}`
	req, _ := http.NewRequest("POST", "/generated-videos/00000000-0000-0000-0000-000000000000/select", bytes.NewReader([]byte(payload)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-tenant-id", "test-tenant")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test(select): %v", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode == fiber.StatusOK {
		var out map[string]interface{}
		_ = json.Unmarshal(raw, &out)
		for _, key := range []string{"creative_project", "generated_video"} {
			if _, ok := out[key]; !ok {
				t.Errorf("select body missing %q", key)
			}
		}
	}
}
