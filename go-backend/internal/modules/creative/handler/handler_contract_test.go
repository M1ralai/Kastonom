// Contract-roundtrip tests for creative handler response DTOs.
// Asserts JSON shape of creative/project/source-asset responses against
// the TS interfaces in
// /Users/atahandemirer/Developer/Kastonom/frontend/src/shared/types/api.ts
// (CreativeProject, CreativeSubject, SourceAsset, CreativeProjectBundle).
package handler

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/modules/creative/dto"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
)

// assertJSONContainsKeys fails the test if any key in expected is missing
// from the JSON object encoded by `v`.
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

func TestContract_CreateCreativeProjectResponse(t *testing.T) {
	str := "x"
	sel := "selected-vid-1"
	latest := "latest-gen-req-1"
	v := dto.CreateCreativeProjectResponse{
		CreativeProject: domain.CreativeProject{
			ID:                        "11111111-1111-1111-1111-111111111111",
			TenantID:                  "22222222-2222-2222-2222-222222222222",
			Name:                      "Project One",
			Status:                    "draft",
			SelectedGeneratedVideoID:  &sel,
			LatestGenerationRequestID: &latest,
			CreatedAt:                 time.Now(),
			UpdatedAt:                 time.Now(),
		},
		CreativeSubject: domain.CreativeSubject{
			ID:        "33333333-3333-3333-3333-333333333333",
			TenantID:  "22222222-2222-2222-2222-222222222222",
			ProjectID: "11111111-1111-1111-1111-111111111111",
			// CreativeSubject.subject_type is an enum in the TS contract.
			// Values declared: "product"|"service"|"brand"|"offer"|"event"|"place"|"other"|"unknown"
			SubjectType:     "product",
			Name:            "Subject One",
			Description:     &str,
			LandingURL:      &str,
			Price:           nil,
			Currency:        nil,
			AllowedClaims:   []string{"free shipping"},
			ForbiddenClaims: []string{"guaranteed"},
			UnknownFields:   []string{},
			// CreativeSubject.source union: "user_input"|"import"|"mock"|"unknown"
			Source:    "user_input",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		SourceAssets: []domain.SourceAsset{
			{
				ID:        "44444444-4444-4444-4444-444444444444",
				TenantID:  "22222222-2222-2222-2222-222222222222",
				ProjectID: nil,
				// AssetType union: "image"|"video"|"url"
				AssetType: "image",
				// AssetSource union: "upload"|"external_url"|"generated"|"mock"
				Source:    "upload",
				URL:       "https://example.com/asset.png",
				CreatedAt: time.Now(),
			},
		},
		FallbackReason: nil,
	}
	assertJSONContainsKeys(t, v, []string{
		"creative_project",
		"creative_subject",
		"source_assets",
	})
	// CreativeProject allow-list
	assertJSONContainsKeys(t, v.CreativeProject, []string{
		"id", "tenant_id", "name", "status",
		"selected_generated_video_id", "latest_generation_request_id",
		"created_at", "updated_at",
	})
	// CreativeSubject allow-list
	assertJSONContainsKeys(t, v.CreativeSubject, []string{
		"id", "tenant_id", "project_id", "subject_type", "name",
		"allowed_claims", "forbidden_claims", "unknown_fields", "source",
		"created_at", "updated_at",
	})
	// SourceAsset allow-list
	assertJSONContainsKeys(t, v.SourceAssets[0], []string{
		"id", "tenant_id", "asset_type", "source", "url", "created_at",
	})
}

func TestContract_CreativeProjectBundleResponse(t *testing.T) {
	sel := "selected-vid-1"
	latest := "latest-gen-req-1"
	provID := "prov-1"
	subj := "Subject One"
	desc := "Subject description"
	url := "https://example.com"
	price := 9.99
	cur := "USD"
	width := 800
	height := 600
	dur := 12.5
	mime := "image/png"
	ck := "abc123"
	genReq := "gen-req-1"
	v := dto.CreativeProjectBundleResponse{
		CreativeProject: domain.CreativeProject{
			ID:                        "11111111-1111-1111-1111-111111111111",
			TenantID:                  "22222222-2222-2222-2222-222222222222",
			Name:                      "Project One",
			Status:                    "ready",
			SelectedGeneratedVideoID:  &sel,
			LatestGenerationRequestID: &latest,
			CreatedAt:                 time.Now(),
			UpdatedAt:                 time.Now(),
		},
		CreativeSubject: &domain.CreativeSubject{
			ID:              "33333333-3333-3333-3333-333333333333",
			TenantID:        "22222222-2222-2222-2222-222222222222",
			ProjectID:       "11111111-1111-1111-1111-111111111111",
			SubjectType:     "product",
			Name:            subj,
			Description:     &desc,
			LandingURL:      &url,
			Price:           &price,
			Currency:        &cur,
			AllowedClaims:   []string{"free shipping"},
			ForbiddenClaims: []string{"guaranteed"},
			UnknownFields:   []string{},
			Source:          "user_input",
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		},
		SourceAssets: []domain.SourceAsset{
			{
				ID:              "44444444-4444-4444-4444-444444444444",
				TenantID:        "22222222-2222-2222-2222-222222222222",
				ProjectID:       nil,
				AssetType:       "image",
				Source:          "upload",
				URL:             "https://example.com/asset.png",
				StorageKey:      nil,
				MimeType:        &mime,
				Width:           &width,
				Height:          &height,
				DurationSeconds: &dur,
				Checksum:        &ck,
				Metadata:        map[string]any{"k": "v"},
				CreatedAt:       time.Now(),
			},
		},
		GenerationRequests: []domain.GenerationRequest{
			{
				ID:                genReq,
				TenantID:          "22222222-2222-2222-2222-222222222222",
				ProjectID:         "11111111-1111-1111-1111-111111111111",
				CreativeSubjectID: "33333333-3333-3333-3333-333333333333",
				SourceAssetIDs:    []string{"44444444-4444-4444-4444-444444444444"},
				// GenerationRequestStatus union:
				// "draft"|"prompt_compiled"|"generating"|"completed"|"failed"|"canceled"
				Status:            "completed",
				// GenerationObjective union:
				// "awareness"|"traffic"|"conversions"|"engagement"|"app_promotion"|"lead_generation"|"unknown"
				Objective:     "conversions",
				TargetAudience: nil,
				// Platform union:
				// "meta_ads"|"google_ads"|"tiktok"|"reels"|"youtube_shorts"|"generic_vertical"|"unknown"
				Platform:        "meta_ads",
				Language:        "en",
				Tone:            nil,
				Style:           nil,
				CallToAction:    nil,
				DurationSeconds: 15,
				// AspectRatio union: "9:16"|"1:1"|"4:5"|"16:9"|"unknown"
				AspectRatio: "9:16",
				UserNotes:   nil,
				FallbackNotes: []string{},
				CreatedAt:    time.Now(),
				UpdatedAt:    time.Now(),
			},
		},
		GeneratedVideos: []domain.GeneratedVideo{
			{
				ID:                  "55555555-5555-5555-5555-555555555555",
				TenantID:            "22222222-2222-2222-2222-222222222222",
				ProjectID:           "11111111-1111-1111-1111-111111111111",
				GenerationRequestID: genReq,
				VideoJobID:          "66666666-6666-6666-6666-666666666666",
				ProviderResultID:    &provID,
				URL:                 "https://cdn.example.com/v.mp4",
				ThumbnailURL:        nil,
				DurationSeconds:     nil,
				AspectRatio:         "9:16",
				// GeneratedVideoStatus union:
				// "generated"|"selected"|"rejected"|"published"|"unavailable"
				Status:     "generated",
				IsSelected: false,
				IsMock:     false,
				CreatedAt:  time.Now(),
				SelectedAt: nil,
			},
		},
	}
	assertJSONContainsKeys(t, v, []string{
		"creative_project",
		"creative_subject",
		"source_assets",
		"generation_requests",
		"generated_videos",
	})
	assertJSONContainsKeys(t, v.CreativeProject, []string{
		"id", "tenant_id", "name", "status",
		"created_at", "updated_at",
	})
	assertJSONContainsKeys(t, *v.CreativeSubject, []string{
		"id", "tenant_id", "project_id", "subject_type", "name",
		"allowed_claims", "forbidden_claims", "unknown_fields", "source",
		"created_at", "updated_at",
	})
	assertJSONContainsKeys(t, v.SourceAssets[0], []string{
		"id", "tenant_id", "asset_type", "source", "url", "created_at",
	})
	assertJSONContainsKeys(t, v.GenerationRequests[0], []string{
		"id", "tenant_id", "project_id", "creative_subject_id", "source_asset_ids",
		"status", "objective", "platform", "language",
		"duration_seconds", "aspect_ratio", "fallback_notes",
		"created_at", "updated_at",
	})
	assertJSONContainsKeys(t, v.GeneratedVideos[0], []string{
		"id", "tenant_id", "project_id", "generation_request_id", "video_job_id",
		"url", "aspect_ratio", "status", "is_selected", "is_mock", "created_at",
	})
}

func TestContract_SourceAssetUploadResponse(t *testing.T) {
	v := dto.SourceAssetUploadResponse{
		SourceAsset: domain.SourceAsset{
			ID:        "44444444-4444-4444-4444-444444444444",
			TenantID:  "22222222-2222-2222-2222-222222222222",
			ProjectID: nil,
			AssetType: "image",
			Source:    "upload",
			URL:       "https://example.com/asset.png",
			CreatedAt: time.Now(),
		},
		UploadURL: "https://upload.example.com/presigned",
	}
	assertJSONContainsKeys(t, v, []string{"source_asset", "upload_url"})
	assertJSONContainsKeys(t, v.SourceAsset, []string{
		"id", "tenant_id", "asset_type", "source", "url", "created_at",
	})
}

func TestContract_ProjectMetricsResponse(t *testing.T) {
	price := 9.99
	cur := "USD"
	margin := 30
	stock := 100
	v := dto.ProjectMetricsResponse{
		ProjectID: "11111111-1111-1111-1111-111111111111",
		CreativeSubject: dto.ProjectMetricsSubjectDTO{
			ID:            "33333333-3333-3333-3333-333333333333",
			Name:          "Subject One",
			Price:         &price,
			Currency:      &cur,
			MarginPercent: &margin,
			StockCount:    &stock,
			AIScore:       92,
			AIReasons:     []string{"trending", "high margin"},
		},
		ERPData: dto.ERPDataDTO{
			StockAvailable: &stock,
			StockReserved:  nil,
			LastSyncAt:     nil,
		},
	}
	assertJSONContainsKeys(t, v, []string{"project_id", "creative_subject", "erp_data"})
	assertJSONContainsKeys(t, v.CreativeSubject, []string{
		"id", "name", "price", "currency", "margin_percent",
		"stock_count", "ai_score", "ai_reasons",
	})
	assertJSONContainsKeys(t, v.ERPData, []string{"stock_available", "stock_reserved", "last_sync_at"})
}
