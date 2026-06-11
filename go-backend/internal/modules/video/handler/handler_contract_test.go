// Contract-roundtrip tests for video handler response DTOs.
// Asserts JSON shape against the TS interfaces in
// /Users/atahandemirer/Developer/Kastonom/frontend/src/shared/types/api.ts
// (VideoJob, ProviderResult, GeneratedVideo, CreativeProject).
package handler

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/modules/video/dto"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
)

func assertJSONContainsKeys(t *testing.T, v any, expected []string) {
	t.Helper()
	raw, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var got map[string]any
	if err := json.Unmarshal(raw, &got); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	for _, k := range expected {
		if _, ok := got[k]; !ok {
			t.Errorf("missing required JSON key %q in encoded %T (raw=%s)", k, v, string(raw))
		}
	}
}

func TestContract_VideoJobResponse(t *testing.T) {
	provJobID := "prov-job-1"
	provResID := "prov-res-1"
	fb := "video_provider_unavailable"
	now := time.Now()
	submitted := now
	v := dto.VideoJobResponse{
		VideoJob: domain.VideoJob{
			ID:                  "vjob-1",
			TenantID:            "tenant-1",
			ProjectID:           "proj-1",
			GenerationRequestID: "gen-req-1",
			PromptPayloadID:     "prompt-1",
			Provider:            "pollo",
			// VideoJobStatus union:
			// "queued"|"submitted"|"processing"|"completed"|"failed"|"canceled"
			Status:         "completed",
			ProviderJobID:  &provJobID,
			IsMock:         false,
			FallbackReason: &fb,
			AttemptCount:   1,
			CreatedAt:      now,
			SubmittedAt:    &submitted,
			CompletedAt:    &submitted,
			UpdatedAt:      now,
		},
		ProviderResult: &domain.ProviderResult{
			ID:               "pres-1",
			TenantID:         "tenant-1",
			VideoJobID:       "vjob-1",
			Provider:         "pollo",
			ProviderJobID:    &provResID,
			NormalizedStatus: "completed",
			ResultURLs:       []string{"https://cdn.example.com/v.mp4"},
			ReceivedAt:       now,
		},
		GeneratedVideos: []domain.GeneratedVideo{
			{
				ID:                  "gv-1",
				TenantID:            "tenant-1",
				ProjectID:           "proj-1",
				GenerationRequestID: "gen-req-1",
				VideoJobID:          "vjob-1",
				ProviderResultID:    &provResID,
				URL:                 "https://cdn.example.com/v.mp4",
				AspectRatio:         "9:16",
				// GeneratedVideoStatus union:
				// "generated"|"selected"|"rejected"|"published"|"unavailable"
				Status:     "selected",
				IsSelected: true,
				IsMock:     false,
				CreatedAt:  now,
				SelectedAt: &submitted,
			},
		},
		FallbackReason: &fb,
	}
	assertJSONContainsKeys(t, v, []string{
		"video_job", "provider_result", "generated_videos", "fallback_reason",
	})
	assertJSONContainsKeys(t, v.VideoJob, []string{
		"id", "tenant_id", "project_id", "generation_request_id", "prompt_payload_id",
		"provider", "status", "is_mock", "attempt_count",
		"created_at", "updated_at",
	})
	assertJSONContainsKeys(t, *v.ProviderResult, []string{
		"id", "tenant_id", "video_job_id", "provider",
		"normalized_status", "result_urls", "received_at",
	})
	assertJSONContainsKeys(t, v.GeneratedVideos[0], []string{
		"id", "tenant_id", "project_id", "generation_request_id", "video_job_id",
		"url", "aspect_ratio", "status", "is_selected", "is_mock", "created_at",
	})
}

func TestContract_FullVideoJobResponse(t *testing.T) {
	thumb := "https://example.com/thumb.jpg"
	dur := 15
	fb := "video_provider_unavailable"
	img := "https://example.com/img.jpg"
	sel := "sel-1"
	latest := "latest-1"
	now := time.Now()
	v := dto.FullVideoJobResponse{
		VideoJob: dto.FullVideoJobDTO{
			ID:             "vjob-1",
			Status:         "completed",
			Provider:       "pollo",
			IsMock:         false,
			FallbackReason: &fb,
			CreatedAt:      "2026-06-11T10:00:00Z",
		},
		GeneratedVideos: []dto.GeneratedVideoPreviewDTO{
			{
				ID:              "gv-1",
				URL:             "https://cdn.example.com/v.mp4",
				ThumbnailURL:    &thumb,
				DurationSeconds: &dur,
				AspectRatio:     "9:16",
				Status:          "selected",
				IsSelected:      true,
			},
		},
		Project: dto.ProjectSummaryDTO{
			ID:   "proj-1",
			Name: "Project One",
		},
		CreativeSubject: &dto.CreativeSubjectPreviewDTO{
			ID:   "subj-1",
			Name: "Subject One",
			Img:  &img,
		},
		GenerationRequest: &dto.GenerationRequestPreviewDTO{
			Platform:     "reels",
			Tone:         &fb,
			Style:        &fb,
			CallToAction: &fb,
		},
	}
	_ = sel
	_ = latest
	_ = now
	assertJSONContainsKeys(t, v, []string{
		"video_job", "generated_videos", "project",
		"creative_subject", "generation_request",
	})
	assertJSONContainsKeys(t, v.VideoJob, []string{
		"id", "status", "provider", "is_mock", "fallback_reason", "created_at",
	})
	assertJSONContainsKeys(t, v.GeneratedVideos[0], []string{
		"id", "url", "thumbnail_url", "duration_seconds",
		"aspect_ratio", "status", "is_selected",
	})
	assertJSONContainsKeys(t, v.Project, []string{"id", "name"})
	assertJSONContainsKeys(t, *v.CreativeSubject, []string{"id", "name", "img"})
	assertJSONContainsKeys(t, *v.GenerationRequest, []string{
		"platform", "tone", "style", "call_to_action",
	})
}

func TestContract_SelectGeneratedVideoResponse(t *testing.T) {
	sel := "sel-1"
	latest := "latest-1"
	now := time.Now()
	v := dto.SelectGeneratedVideoResponse{
		CreativeProject: domain.CreativeProject{
			ID:                        "proj-1",
			TenantID:                  "tenant-1",
			Name:                      "Project One",
			Status:                    "published",
			SelectedGeneratedVideoID:  &sel,
			LatestGenerationRequestID: &latest,
			CreatedAt:                 now,
			UpdatedAt:                 now,
		},
		GeneratedVideo: domain.GeneratedVideo{
			ID:                  "gv-1",
			TenantID:            "tenant-1",
			ProjectID:           "proj-1",
			GenerationRequestID: "gen-req-1",
			VideoJobID:          "vjob-1",
			URL:                 "https://cdn.example.com/v.mp4",
			AspectRatio:         "9:16",
			Status:              "selected",
			IsSelected:          true,
			IsMock:              false,
			CreatedAt:           now,
			SelectedAt:          &now,
		},
	}
	assertJSONContainsKeys(t, v, []string{"creative_project", "generated_video"})
	assertJSONContainsKeys(t, v.CreativeProject, []string{
		"id", "tenant_id", "name", "status",
		"selected_generated_video_id", "latest_generation_request_id",
		"created_at", "updated_at",
	})
	assertJSONContainsKeys(t, v.GeneratedVideo, []string{
		"id", "tenant_id", "project_id", "generation_request_id", "video_job_id",
		"url", "aspect_ratio", "status", "is_selected", "is_mock", "created_at",
	})
}
