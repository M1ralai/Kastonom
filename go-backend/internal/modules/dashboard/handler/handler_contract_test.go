// Contract-roundtrip tests for dashboard handler response DTOs.
// The dashboard responses (KpiSummaryResponse, RecentActivitiesResponse)
// are bespoke shapes that are not modeled in api.ts, so the tests pin
// the JSON keys directly against the struct tags.
package handler

import (
	"encoding/json"
	"testing"

	"github.com/M1ralai/Kastonom/backend/internal/modules/dashboard/dto"
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

func TestContract_KpiSummaryResponse(t *testing.T) {
	v := dto.KpiSummaryResponse{
		MonthlyVideoCount:  12,
		MonthlyVideoChange: 4,
		RemainingCredits:   100,
		CreditCurrency:     "USD",
		AverageCTR:         0.025,
		SectorAverageCTR:   0.018,
		CTRChangePercent:   5,
	}
	assertJSONContainsKeys(t, v, []string{
		"monthly_video_count", "monthly_video_change",
		"remaining_credits", "credit_currency",
		"average_ctr", "sector_average_ctr", "ctr_change_percent",
	})
}

func TestContract_RecentActivitiesResponse(t *testing.T) {
	v := dto.RecentActivitiesResponse{
		Activities: []dto.RecentActivityDTO{
			{
				ID:          "act-1",
				ProjectID:   "proj-1",
				ProjectName: "Project One",
				Status:      "ready",
				Icon:        "video",
				GeneratedVideo: &dto.ActivityGeneratedVideoDTO{
					Impressions: 1000,
					CTR:         0.025,
				},
				UpdatedAt: "2026-06-11T10:00:00Z",
			},
		},
	}
	assertJSONContainsKeys(t, v, []string{"activities"})
	assertJSONContainsKeys(t, v.Activities[0], []string{
		"id", "project_id", "project_name", "status", "icon",
		"generated_video", "updated_at",
	})
	assertJSONContainsKeys(t, v.Activities[0].GeneratedVideo, []string{"impressions", "ctr"})
}
