// Contract-roundtrip tests for iteration handler response DTOs.
// Asserts JSON shape against the TS contract in
// /Users/atahandemirer/Developer/Kastonom/frontend/src/shared/types/api.ts.
// Note: the iteration suggestion is exposed as a flat
// domain.CreativeIterationSuggestion. There is no dedicated TS interface
// for it, so the test pins its allow-list directly.
package handler

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/modules/iteration/dto"
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

func TestContract_CreateIterationSuggestionResponse(t *testing.T) {
	metricsID := "metrics-1"
	v := dto.CreateIterationSuggestionResponse{
		CreativeIterationSuggestion: domain.CreativeIterationSuggestion{
			ID:                  "iter-1",
			TenantID:            "22222222-2222-2222-2222-222222222222",
			ProjectID:           "proj-1",
			GeneratedVideoID:    "gv-1",
			AdMetricsSnapshotID: &metricsID,
			Reason:              "low_ctr",
			SuggestedChanges:    []string{"change_hook", "tighten_pacing"},
			Confidence:          "high",
			Status:              "open",
			CreatedAt:           time.Now(),
		},
	}
	assertJSONContainsKeys(t, v, []string{"creative_iteration_suggestion"})
	assertJSONContainsKeys(t, v.CreativeIterationSuggestion, []string{
		"id", "tenant_id", "project_id", "generated_video_id",
		"reason", "suggested_changes", "confidence", "status", "created_at",
	})
}
