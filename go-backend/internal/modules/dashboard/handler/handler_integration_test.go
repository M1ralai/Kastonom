// Package handler — integration tests for the dashboard module.
//
//   - GET /dashboard/kpi-summary
//   - GET /dashboard/recent-activities
//
// Frontend type: KpiSummary / RecentActivitiesResponse (see
// frontend/src/shared/api/kastonomApi.ts).
package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"github.com/gofiber/fiber/v3"
)

func newTestAppOrSkip(t *testing.T) *fiber.App {
	t.Helper()
	t.Skip("NewTestApp not yet implemented; reconciler will add (signature: func NewTestApp(db *sqlx.DB) (*fiber.App, error)). Dashboard requires DB — covered by skipped stub.")
	return nil
}

// TestDashboard_KpiSummary_ResponseShape asserts:
//
//	GET /dashboard/kpi-summary
//	- 200, application/json
//	- body: { monthly_video_count, monthly_video_change, remaining_credits, credit_currency, average_ctr, sector_average_ctr, ctr_change_percent }
func TestIntegration_TestDashboard_KpiSummary_ResponseShape(t *testing.T) {
	app := newTestAppOrSkip(t)
	req, _ := http.NewRequest("GET", "/dashboard/kpi-summary", nil)
	req.Header.Set("x-tenant-id", "test-tenant")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test(kpi): %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("status: want 200, got %d", resp.StatusCode)
	}
	raw, _ := io.ReadAll(resp.Body)
	var out map[string]interface{}
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("kpi body not JSON: %v\nraw=%s", err, string(raw))
	}
	for _, key := range []string{
		"monthly_video_count", "monthly_video_change",
		"remaining_credits", "credit_currency",
		"average_ctr", "sector_average_ctr", "ctr_change_percent",
	} {
		if _, ok := out[key]; !ok {
			t.Errorf("kpi body missing %q", key)
		}
	}
}

// TestDashboard_RecentActivities_ResponseShape asserts:
//
//	GET /dashboard/recent-activities?limit=N
//	- body: { activities: [{ id, project_id, project_name, status, icon, generated_video: {impressions, ctr}|null, updated_at }] }
func TestIntegration_TestDashboard_RecentActivities_ResponseShape(t *testing.T) {
	app := newTestAppOrSkip(t)
	req, _ := http.NewRequest("GET", "/dashboard/recent-activities?limit=10", nil)
	req.Header.Set("x-tenant-id", "test-tenant")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test(activities): %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("status: want 200, got %d", resp.StatusCode)
	}
	raw, _ := io.ReadAll(resp.Body)
	var out struct {
		Activities []map[string]interface{} `json:"activities"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("activities body not JSON: %v\nraw=%s", err, string(raw))
	}
	for i, a := range out.Activities {
		for _, key := range []string{"id", "project_id", "project_name", "status", "updated_at"} {
			if _, ok := a[key]; !ok {
				t.Errorf("activity[%d] missing %q", i, key)
			}
		}
	}
}
