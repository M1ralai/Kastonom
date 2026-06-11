// Contract-roundtrip tests for publication handler response DTOs.
// Asserts JSON shape against the TS interfaces in
// /Users/atahandemirer/Developer/Kastonom/frontend/src/shared/types/api.ts
// (AdPublication, AdMetricsSnapshot).
package handler

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/modules/publication/dto"
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

func TestContract_CreateAdPublicationResponse(t *testing.T) {
	connID := "conn-1"
	extCamp := "ext-camp-1"
	extGroup := "ext-group-1"
	extAd := "ext-ad-1"
	dest := "https://example.com/landing"
	ec := "auth_rejected"
	em := "invalid token"
	now := time.Now()
	published := now
	paused := now
	v := dto.CreateAdPublicationResponse{
		AdPublication: domain.AdPublication{
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
		FallbackReason: nil,
	}
	assertJSONContainsKeys(t, v, []string{"ad_publication", "fallback_reason"})
	assertJSONContainsKeys(t, v.AdPublication, []string{
		"id", "tenant_id", "project_id", "generated_video_id",
		"platform", "status", "created_at", "updated_at",
	})
}

func TestContract_SyncMetricsResponse(t *testing.T) {
	imp := int64(1000)
	clk := int64(25)
	spend := 12.5
	cur := "USD"
	ctr := 0.025
	cpc := 0.5
	conv := 1.0
	convVal := 25.0
	roas := 2.0
	vv := int64(800)
	vvr := 0.8
	cpvv := 0.015
	v := dto.SyncMetricsResponse{
		MetricsSnapshot: domain.AdMetricsSnapshot{
			ID:               "snap-1",
			TenantID:         "tenant-1",
			AdPublicationID:  "adp-1",
			// AdPlatform union: "meta_ads"|"google_ads"
			Platform: "meta_ads",
			// MetricsSource union:
			// "meta_ads_api"|"google_ads_api"|"mock"|"manual"|"unknown"
			Source:           "meta_ads_api",
			DateStart:        "2026-06-01",
			DateEnd:          "2026-06-07",
			Impressions:      &imp,
			Clicks:           &clk,
			Spend:            &spend,
			Currency:         &cur,
			CTR:              &ctr,
			CPC:              &cpc,
			Conversions:      &conv,
			ConversionValue:  &convVal,
			ROAS:             &roas,
			VideoViews:       &vv,
			VideoViewRate:    &vvr,
			CostPerVideoView: &cpvv,
			FetchedAt:        time.Now(),
		},
	}
	assertJSONContainsKeys(t, v, []string{"metrics_snapshot"})
	assertJSONContainsKeys(t, v.MetricsSnapshot, []string{
		"id", "tenant_id", "ad_publication_id", "platform", "source",
		"date_start", "date_end", "fetched_at",
	})
}
