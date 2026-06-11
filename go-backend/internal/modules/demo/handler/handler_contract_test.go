// Contract-roundtrip tests for demo handler response DTOs.
// DemoFallbackResponse is a wrapper around every domain type. This test
// pins each embedded field's JSON keys against the corresponding TS
// interface in
// /Users/atahandemirer/Developer/Kastonom/frontend/src/shared/types/api.ts.
package handler

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/modules/demo/dto"
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

func TestContract_DemoFallbackResponse(t *testing.T) {
	sel := "sel-1"
	latest := "latest-1"
	provJobID := "prov-job-1"
	provResID := "prov-res-1"
	fb := "low_ctr"
	connID := "conn-1"
	extCamp := "ext-camp"
	extGroup := "ext-group"
	extAd := "ext-ad"
	dest := "https://example.com/landing"
	ec := "auth_rejected"
	em := "invalid token"
	now := time.Now()
	submitted := now
	published := now
	paused := now
	thumb := "https://example.com/thumb.jpg"
	dur := 15
	provResSnapID := "snap-1"
	v := dto.DemoFallbackResponse{
		CreativeProject: &domain.CreativeProject{
			ID:                        "proj-1",
			TenantID:                  "tenant-1",
			Name:                      "Project One",
			Status:                    "ready",
			SelectedGeneratedVideoID:  &sel,
			LatestGenerationRequestID: &latest,
			CreatedAt:                 now,
			UpdatedAt:                 now,
		},
		CreativeSubject: &domain.CreativeSubject{
			ID:              "subj-1",
			TenantID:        "tenant-1",
			ProjectID:       "proj-1",
			SubjectType:     "product",
			Name:            "Subject One",
			AllowedClaims:   []string{"free shipping"},
			ForbiddenClaims: []string{"guaranteed"},
			UnknownFields:   []string{},
			Source:          "user_input",
			CreatedAt:       now,
			UpdatedAt:       now,
		},
		SourceAssets: []domain.SourceAsset{
			{
				ID:        "asset-1",
				TenantID:  "tenant-1",
				ProjectID: nil,
				AssetType: "image",
				Source:    "upload",
				URL:       "https://example.com/a.png",
				CreatedAt: now,
			},
		},
		GenerationRequest: &domain.GenerationRequest{
			ID:                "gen-req-1",
			TenantID:          "tenant-1",
			ProjectID:         "proj-1",
			CreativeSubjectID: "subj-1",
			SourceAssetIDs:    []string{"asset-1"},
			Status:            "completed",
			Objective:         "conversions",
			Platform:          "reels",
			Language:          "en",
			DurationSeconds:   15,
			AspectRatio:       "9:16",
			FallbackNotes:     []string{},
			CreatedAt:         now,
			UpdatedAt:         now,
		},
		PromptPayload: &domain.PromptPayload{
			ID:                  "prompt-1",
			TenantID:            "tenant-1",
			ProjectID:           "proj-1",
			GenerationRequestID: "gen-req-1",
			Provider:            "pollo",
			PromptText:          "Sample prompt.",
			NegativePrompt:      "blurry",
			Language:            "en",
			DurationSeconds:     15,
			AspectRatio:         "9:16",
			SourceAssetIDs:      []string{"asset-1"},
			ProviderOptions:     map[string]any{"seed": 1},
			IsMock:              true,
			FallbackNotes:       []string{},
			CreatedAt:           now,
		},
		VideoJob: &domain.VideoJob{
			ID:                  "vjob-1",
			TenantID:            "tenant-1",
			ProjectID:           "proj-1",
			GenerationRequestID: "gen-req-1",
			PromptPayloadID:     "prompt-1",
			Provider:            "pollo",
			Status:              "completed",
			ProviderJobID:       &provJobID,
			IsMock:              true,
			AttemptCount:        1,
			CreatedAt:           now,
			SubmittedAt:         &submitted,
			CompletedAt:         &submitted,
			UpdatedAt:           now,
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
				ThumbnailURL:        &thumb,
				DurationSeconds:     &dur,
				AspectRatio:         "9:16",
				Status:              "selected",
				IsSelected:          true,
				IsMock:              true,
				CreatedAt:           now,
				SelectedAt:          &submitted,
			},
		},
		SelectedGeneratedVideo: &domain.GeneratedVideo{
			ID:                  "gv-1",
			TenantID:            "tenant-1",
			ProjectID:           "proj-1",
			GenerationRequestID: "gen-req-1",
			VideoJobID:          "vjob-1",
			ProviderResultID:    &provResID,
			URL:                 "https://cdn.example.com/v.mp4",
			ThumbnailURL:        &thumb,
			DurationSeconds:     &dur,
			AspectRatio:         "9:16",
			Status:              "selected",
			IsSelected:          true,
			IsMock:              true,
			CreatedAt:           now,
			SelectedAt:          &submitted,
		},
		AdPublication: &domain.AdPublication{
			ID:                     "adp-1",
			TenantID:               "tenant-1",
			ProjectID:              "proj-1",
			GeneratedVideoID:       "gv-1",
			AdPlatformConnectionID: &connID,
			// AdPlatform union: "meta_ads"|"google_ads"
			Platform: "meta_ads",
			// AdPublicationStatus union:
			// "draft"|"publishing"|"published"|"failed"|"paused"|"archived"
			Status:             "published",
			ExternalCampaignID: &extCamp,
			ExternalAdGroupID:  &extGroup,
			ExternalAdID:       &extAd,
			DestinationURL:     &dest,
			PublishedAt:        &published,
			PausedAt:           &paused,
			ErrorCode:          &ec,
			ErrorMessage:       &em,
			CreatedAt:          now,
			UpdatedAt:          now,
		},
		MetricsSnapshot: &domain.AdMetricsSnapshot{
			ID:              "snap-1",
			TenantID:        "tenant-1",
			AdPublicationID: "adp-1",
			// AdPlatform union: "meta_ads"|"google_ads"
			Platform: "meta_ads",
			// MetricsSource union:
			// "meta_ads_api"|"google_ads_api"|"mock"|"manual"|"unknown"
			Source:    "meta_ads_api",
			DateStart: "2026-06-01",
			DateEnd:   "2026-06-07",
			FetchedAt: now,
		},
		CreativeIterationSuggestion: &domain.CreativeIterationSuggestion{
			ID:                  "iter-1",
			TenantID:            "tenant-1",
			ProjectID:           "proj-1",
			GeneratedVideoID:    "gv-1",
			AdMetricsSnapshotID: &provResSnapID,
			Reason:              fb,
			SuggestedChanges:    []string{"change_hook"},
			Confidence:          "high",
			Status:              "open",
			CreatedAt:           now,
		},
		FallbackReason: fb,
	}
	assertJSONContainsKeys(t, v, []string{
		"creative_project", "creative_subject", "source_assets",
		"generation_request", "prompt_payload", "video_job", "provider_result",
		"generated_videos", "selected_generated_video", "ad_publication",
		"metrics_snapshot", "creative_iteration_suggestion", "fallback_reason",
	})
	assertJSONContainsKeys(t, v.CreativeProject, []string{
		"id", "tenant_id", "name", "status", "created_at", "updated_at",
	})
	assertJSONContainsKeys(t, v.CreativeSubject, []string{
		"id", "tenant_id", "project_id", "subject_type", "name",
		"allowed_claims", "forbidden_claims", "unknown_fields", "source",
		"created_at", "updated_at",
	})
	assertJSONContainsKeys(t, v.SourceAssets[0], []string{
		"id", "tenant_id", "asset_type", "source", "url", "created_at",
	})
	assertJSONContainsKeys(t, v.GenerationRequest, []string{
		"id", "tenant_id", "project_id", "creative_subject_id", "source_asset_ids",
		"status", "objective", "platform", "language",
		"duration_seconds", "aspect_ratio", "fallback_notes",
		"created_at", "updated_at",
	})
	assertJSONContainsKeys(t, v.PromptPayload, []string{
		"id", "tenant_id", "project_id", "generation_request_id",
		"provider", "prompt_text", "negative_prompt", "language",
		"duration_seconds", "aspect_ratio", "source_asset_ids",
		"is_mock", "fallback_notes", "created_at",
	})
	assertJSONContainsKeys(t, v.VideoJob, []string{
		"id", "tenant_id", "project_id", "generation_request_id", "prompt_payload_id",
		"provider", "status", "is_mock", "attempt_count",
		"created_at", "updated_at",
	})
	assertJSONContainsKeys(t, v.ProviderResult, []string{
		"id", "tenant_id", "video_job_id", "provider",
		"normalized_status", "result_urls", "received_at",
	})
	assertJSONContainsKeys(t, v.GeneratedVideos[0], []string{
		"id", "tenant_id", "project_id", "generation_request_id", "video_job_id",
		"url", "aspect_ratio", "status", "is_selected", "is_mock", "created_at",
	})
	assertJSONContainsKeys(t, v.AdPublication, []string{
		"id", "tenant_id", "project_id", "generated_video_id", "platform",
		"status", "created_at", "updated_at",
	})
	assertJSONContainsKeys(t, v.MetricsSnapshot, []string{
		"id", "tenant_id", "ad_publication_id", "platform", "source",
		"date_start", "date_end", "fetched_at",
	})
	assertJSONContainsKeys(t, v.CreativeIterationSuggestion, []string{
		"id", "tenant_id", "project_id", "generated_video_id",
		"reason", "suggested_changes", "confidence", "status", "created_at",
	})
}
