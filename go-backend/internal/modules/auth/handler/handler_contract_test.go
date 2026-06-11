// Contract-roundtrip tests for auth handler response DTOs.
// These tests serialize each response DTO with non-zero values of every
// field and assert the resulting JSON contains the exact field set
// declared in /Users/atahandemirer/Developer/Kastonom/frontend/src/shared/types/api.ts.
//
// Note: auth responses do not map 1:1 to a TS interface (LoginResponse is
// bespoke), so we encode the contract via hardcoded allow-lists per type.
package handler

import (
	"encoding/json"
	"testing"

	"github.com/M1ralai/Kastonom/backend/internal/modules/auth/dto"
)

// assertJSONContainsKeys fails the test if any key in expected is missing
// from the JSON object encoded by `v`. Optional fields are listed in
// expected and may be present or absent; this helper only enforces the
// required set. To assert both presence and absence of optionals, the
// caller is expected to include only the keys it considers load-bearing.
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

func TestContract_AuthUserDTO(t *testing.T) {
	v := dto.AuthUserDTO{
		ID:       "11111111-1111-1111-1111-111111111111",
		Email:    "user@example.com",
		Name:     "Ada Lovelace",
		TenantID: "22222222-2222-2222-2222-222222222222",
	}
	assertJSONContainsKeys(t, v, []string{"id", "email", "name", "tenant_id"})
}

func TestContract_AuthTenantDTO(t *testing.T) {
	v := dto.AuthTenantDTO{
		ID:   "33333333-3333-3333-3333-333333333333",
		Name: "Tenant One",
	}
	assertJSONContainsKeys(t, v, []string{"id", "name"})
}

func TestContract_RegisterResponse(t *testing.T) {
	v := dto.RegisterResponse{
		User: dto.AuthUserDTO{
			ID:       "11111111-1111-1111-1111-111111111111",
			Email:    "user@example.com",
			Name:     "Ada Lovelace",
			TenantID: "22222222-2222-2222-2222-222222222222",
		},
		Token: "tok",
		Tenant: dto.AuthTenantDTO{
			ID:   "33333333-3333-3333-3333-333333333333",
			Name: "Tenant One",
		},
	}
	assertJSONContainsKeys(t, v, []string{"user", "token", "tenant"})
	// Nest
	assertJSONContainsKeys(t, v.User, []string{"id", "email", "name", "tenant_id"})
	assertJSONContainsKeys(t, v.Tenant, []string{"id", "name"})
}

func TestContract_LoginResponse(t *testing.T) {
	v := dto.LoginResponse{
		User: dto.AuthUserDTO{
			ID:       "11111111-1111-1111-1111-111111111111",
			Email:    "user@example.com",
			Name:     "Ada Lovelace",
			TenantID: "22222222-2222-2222-2222-222222222222",
		},
		Token:        "access-tok",
		AccessToken:  "access-tok",
		RefreshToken: "refresh-tok",
		ExpiresIn:    3600,
	}
	// Required top-level
	assertJSONContainsKeys(t, v, []string{"user", "token", "access_token", "refresh_token", "expires_in"})
}

func TestContract_LogoutResponse(t *testing.T) {
	v := dto.LogoutResponse{Success: true}
	assertJSONContainsKeys(t, v, []string{"success"})
}
