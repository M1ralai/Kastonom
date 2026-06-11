// Contract-roundtrip tests for generation handler response DTOs.
// Asserts JSON shape against the TS interfaces in
// /Users/atahandemirer/Developer/Kastonom/frontend/src/shared/types/api.ts
// (GenerationRequest, PromptPayload, VideoJob, ProviderResult, GeneratedVideo).
package handler

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/modules/generation/dto"
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

func TestContract_GenerationRequestResponse(t *testing.T) {
	provJobID := "prov-job-1"
	provResID := "prov-res-1"
	fb := "video_provider_unavailable"
	ec := "rate_limited"
	em := "exceeded provider quota"
	rawSt := "in_progress"
	now := time.Now()
	submitted := now
	v := dto.GenerationRequestResponse{
		GenerationRequest: domain.GenerationRequest{
			ID:                "gen-req-1",
			TenantID:          "22222222-2222-2222-2222-222222222222",
			ProjectID:         "proj-1",
			CreativeSubjectID: "subj-1",
			SourceAssetIDs:    []string{"asset-1", "asset-2"},
			// GenerationRequestStatus union:
			// "draft"|"prompt_compiled"|"generating"|"completed"|"failed"|"canceled"
			Status: "generating",
			// GenerationObjective union:
			// "awareness"|"traffic"|"conversions"|"engagement"|"app_promotion"|"lead_generation"|"unknown"
			Objective:       "conversions",
			TargetAudience:  nil,
			Platform:        "reels",
			Language:        "en",
			Tone:            nil,
			Style:           nil,
			CallToAction:    nil,
			DurationSeconds: 15,
			// AspectRatio union: "9:16"|"1:1"|"4:5"|"16:9"|"unknown"
			AspectRatio:   "9:16",
			UserNotes:     nil,
			FallbackNotes: []string{"prompt_truncated"},
			CreatedAt:     now,
			UpdatedAt:     now,
		},
		PromptPayload: domain.PromptPayload{
			ID:                  "prompt-1",
			TenantID:            "22222222-2222-2222-2222-222222222222",
			ProjectID:           "proj-1",
			GenerationRequestID: "gen-req-1",
			// VideoProvider union: "pollo"|"kling"|"runway"
			Provider:        "pollo",
			PromptText:      "A vibrant ad for our launch.",
			NegativePrompt:  "blurry, low quality",
			Language:        "en",
			DurationSeconds: 15,
			AspectRatio:     "9:16",
			SourceAssetIDs:  []string{"asset-1", "asset-2"},
			ProviderOptions: map[string]any{"seed": 42},
			IsMock:          false,
			FallbackNotes:   []string{},
			CreatedAt:       now,
		},
		VideoJob: domain.VideoJob{
			ID:                  "vjob-1",
			TenantID:            "22222222-2222-2222-2222-222222222222",
			ProjectID:           "proj-1",
			GenerationRequestID: "gen-req-1",
			PromptPayloadID:     "prompt-1",
			Provider:            "pollo",
			// VideoJobStatus union:
			// "queued"|"submitted"|"processing"|"completed"|"failed"|"canceled"
			Status:        "submitted",
			ProviderJobID: &provJobID,
			IsMock:        false,
			FallbackReason: &fb,
			ErrorCode:     &ec,
			ErrorMessage:  &em,
			AttemptCount:  1,
			CreatedAt:     now,
			SubmittedAt:   &submitted,
			CompletedAt:   nil,
			UpdatedAt:     now,
		},
		ProviderResult: &domain.ProviderResult{
			ID:               "pres-1",
			TenantID:         "22222222-2222-2222-2222-222222222222",
			VideoJobID:       "vjob-1",
			Provider:         "pollo",
			ProviderJobID:    &provResID,
			RawStatus:        &rawSt,
			NormalizedStatus: "processing",
			ResultURLs:       []string{"https://cdn.example.com/v.mp4"},
			ErrorCode:        nil,
			ErrorMessage:     nil,
			RedactedMetadata: map[string]any{"model": "pollo-v1"},
			ReceivedAt:       now,
		},
		GeneratedVideos: []domain.GeneratedVideo{
			{
				ID:                  "gv-1",
				TenantID:            "22222222-2222-2222-2222-222222222222",
				ProjectID:           "proj-1",
				GenerationRequestID: "gen-req-1",
				VideoJobID:          "vjob-1",
				ProviderResultID:    &provResID,
				URL:                 "https://cdn.example.com/v.mp4",
				ThumbnailURL:        nil,
				DurationSeconds:     nil,
				AspectRatio:         "9:16",
				// GeneratedVideoStatus union:
				// "generated"|"selected"|"rejected"|"published"|"unavailable"
				Status:     "generated",
				IsSelected: false,
				IsMock:     false,
				CreatedAt:  now,
				SelectedAt: nil,
			},
		},
		FallbackReason: &fb,
	}
	assertJSONContainsKeys(t, v, []string{
		"generation_request",
		"prompt_payload",
		"video_job",
		"provider_result",
		"generated_videos",
		"fallback_reason",
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
	assertJSONContainsKeys(t, *v.ProviderResult, []string{
		"id", "tenant_id", "video_job_id", "provider",
		"normalized_status", "result_urls", "received_at",
	})
	assertJSONContainsKeys(t, v.GeneratedVideos[0], []string{
		"id", "tenant_id", "project_id", "generation_request_id", "video_job_id",
		"url", "aspect_ratio", "status", "is_selected", "is_mock", "created_at",
	})
}

func TestContract_EstimateCostResponse(t *testing.T) {
	v := dto.EstimateCostResponse{
		EstimatedCredits: 1,
		EstimatedCost: dto.EstimatedCostDTO{
			Amount:    100,
			Currency:  "USD",
			MaxAmount: 150,
		},
	}
	assertJSONContainsKeys(t, v, []string{"estimated_credits", "estimated_cost"})
	assertJSONContainsKeys(t, v.EstimatedCost, []string{"amount", "currency", "max_amount"})
}
