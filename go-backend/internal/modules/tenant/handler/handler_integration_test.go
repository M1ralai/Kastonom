// Package handler — integration tests for the tenant module.
//
//   - GET /tenant/credits
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
	t.Skip("NewTestApp not yet implemented; reconciler will add (signature: func NewTestApp(db *sqlx.DB) (*fiber.App, error)). Tenant requires DB — covered by skipped stub.")
	return nil
}

// TestTenant_Credits_ResponseShape asserts:
//
//	GET /tenant/credits
//	- 200, application/json
//	- body: { tenant_id, current_credits, credit_currency, monthly_allowance, used_this_month, videos_per_credit }
//
// Frontend type: TenantCredits (kastonomApi.ts).
func TestIntegration_TestTenant_Credits_ResponseShape(t *testing.T) {
	app := newTestAppOrSkip(t)
	req, _ := http.NewRequest("GET", "/tenant/credits", nil)
	req.Header.Set("x-tenant-id", "test-tenant")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test(credits): %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("status: want 200, got %d", resp.StatusCode)
	}
	raw, _ := io.ReadAll(resp.Body)
	var out map[string]interface{}
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("credits body not JSON: %v\nraw=%s", err, string(raw))
	}
	for _, key := range []string{
		"tenant_id", "current_credits", "credit_currency",
		"monthly_allowance", "used_this_month", "videos_per_credit",
	} {
		if _, ok := out[key]; !ok {
			t.Errorf("credits body missing %q", key)
		}
	}
}
