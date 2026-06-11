// Package handler — integration tests for the auth module.
//
// These tests drive the actual Fiber handlers (the same handlers the
// frontend reaches at /auth/login and /auth/register) via
// bootstrap.NewTestApp + app.Test(). They are *contract* tests: they
// assert the response status, content-type, and that every JSON field
// the frontend reads is present and of the right type.
//
// The reconciler is expected to add bootstrap.NewTestApp(db *sqlx.DB)
// which returns a fully wired *fiber.App. Until that constructor
// exists, this file is intentionally a stub: every test calls
// t.Skip() with the reconciler-needed reason so the rest of the
// workflow can proceed without flaky builds.
package handler

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"github.com/gofiber/fiber/v3"
)

// newTestAppOrSkip returns a Fiber app wired by the reconciler-supplied
// NewTestApp. If the constructor has not been added yet, the test is
// skipped so the contract layer is non-blocking.
//
// NOTE: this test package intentionally does NOT import internal/bootstrap
// because bootstrap already imports the production handler packages;
// doing so would form a Go import cycle through the test binary. The
// reconciler is expected to add:
//
//	package bootstrap
//	func NewTestApp(db *sqlx.DB) (*fiber.App, error)
//
// When the reconciler does, the test should import bootstrap and replace
// the body of newTestAppOrSkip with `return bootstrap.NewTestApp(db)`.
func newTestAppOrSkip(t *testing.T, db interface{}) *fiber.App {
	t.Helper()
	t.Skip("NewTestApp not yet implemented; reconciler will add (signature: func NewTestApp(db *sqlx.DB) (*fiber.App, error)). Auth requires DB for register/login — covered by skipped stub.")
	_ = db
	return nil
}

// TestAuth_Login_ResponseShape exercises the contract:
//
//	POST /auth/login
//	- status 200
//	- Content-Type: application/json
//	- body: { user: {id, email, name, tenant_id}, token, access_token?, refresh_token?, expires_in? }
//
// The frontend (frontend/src/shared/api/kastonomApi.ts::login) reads
// `result.token` and `result.user` — both MUST be present.
func TestIntegration_TestAuth_Login_ResponseShape(t *testing.T) {
	app := newTestAppOrSkip(t, nil)
	body := bytes.NewReader([]byte(`{"email":"user@example.com","password":"password123"}`))
	req, _ := http.NewRequest("POST", "/auth/login", body)
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test(login): %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("status: want 200, got %d", resp.StatusCode)
	}
	if ct := resp.Header.Get("Content-Type"); !bytes.Contains([]byte(ct), []byte("application/json")) {
		t.Fatalf("Content-Type: want application/json, got %q", ct)
	}
	raw, _ := io.ReadAll(resp.Body)
	var out struct {
		User struct {
			ID       string `json:"id"`
			Email    string `json:"email"`
			Name     string `json:"name"`
			TenantID string `json:"tenant_id"`
		} `json:"user"`
		Token        string `json:"token"`
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		ExpiresIn    int    `json:"expires_in"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("login body not JSON: %v\nraw=%s", err, string(raw))
	}
	if out.User.Email == "" {
		t.Errorf("login.user.email missing in wire")
	}
	if out.User.TenantID == "" {
		t.Errorf("login.user.tenant_id missing — frontend pins x-tenant-id from this field")
	}
	if out.Token == "" {
		t.Errorf("login.token missing — frontend stores it in localStorage")
	}
}

// TestAuth_Register_ResponseShape exercises:
//
//	POST /auth/register
//	- status 201
//	- body: { user, token, tenant: {id, name} }
//
// Frontend reads user.email, user.tenant_id (it prepends result.tenant.id
// to user.tenant_id before storing), and result.token.
func TestIntegration_TestAuth_Register_ResponseShape(t *testing.T) {
	app := newTestAppOrSkip(t, nil)
	body := bytes.NewReader([]byte(`{"email":"new@example.com","password":"password123","name":"New","company_name":"Acme"}`))
	req, _ := http.NewRequest("POST", "/auth/register", body)
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test(register): %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != fiber.StatusCreated {
		t.Fatalf("status: want 201, got %d", resp.StatusCode)
	}
	raw, _ := io.ReadAll(resp.Body)
	var out struct {
		User struct {
			ID       string `json:"id"`
			Email    string `json:"email"`
			Name     string `json:"name"`
			TenantID string `json:"tenant_id"`
		} `json:"user"`
		Token  string `json:"token"`
		Tenant struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"tenant"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("register body not JSON: %v\nraw=%s", err, string(raw))
	}
	if out.User.Email == "" {
		t.Errorf("register.user.email missing")
	}
	if out.Tenant.ID == "" {
		t.Errorf("register.tenant.id missing — frontend pins tenant from this field")
	}
	if out.Token == "" {
		t.Errorf("register.token missing")
	}
}
