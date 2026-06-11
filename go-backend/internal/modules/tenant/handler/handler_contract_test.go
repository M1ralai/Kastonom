// Contract-roundtrip tests for tenant handler response DTOs.
// Asserts JSON shape of tenant details/credits responses against the
// TS interface Tenant (and the bespoke TenantCreditsResponse).
package handler

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/modules/tenant/dto"
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

func TestContract_TenantDetailsResponse(t *testing.T) {
	v := dto.TenantDetailsResponse{
		ID:        "11111111-1111-1111-1111-111111111111",
		Name:      "Tenant One",
		Mode:      "live",
		Status:    "active",
		CreatedAt: time.Now(),
	}
	// Required keys per TS interface Tenant.
	assertJSONContainsKeys(t, v, []string{"id", "name", "mode", "status", "created_at"})
}

func TestContract_TenantCreditsResponse(t *testing.T) {
	v := dto.TenantCreditsResponse{
		TenantID:         "11111111-1111-1111-1111-111111111111",
		CurrentCredits:   100,
		CreditCurrency:   "USD",
		MonthlyAllowance: 500,
		UsedThisMonth:    42,
		VideosPerCredit:  1,
	}
	assertJSONContainsKeys(t, v, []string{
		"tenant_id",
		"current_credits",
		"credit_currency",
		"monthly_allowance",
		"used_this_month",
		"videos_per_credit",
	})
}
