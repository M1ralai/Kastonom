package httpx

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"

	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/gofiber/fiber/v3"
)

type ErrorResponse struct {
	Error             string `json:"error"`
	Message           string `json:"message"`
	FallbackAvailable bool   `json:"fallback_available,omitempty"`
}

func TenantContext(c fiber.Ctx, cfg domain.AppConfig) domain.TenantContext {
	tenantID := c.Get("x-tenant-id")
	if tenantID == "" {
		tenantID = cfg.DemoTenantID
	}
	requestID := c.Get("x-request-id")
	if requestID == "" {
		requestID = "req-local"
	}
	return domain.TenantContext{
		RequestID:       requestID,
		TenantID:        tenantID,
		Mode:            cfg.Mode,
		FallbackEnabled: cfg.FallbackEnabled,
		IsDemoTenant:    tenantID == cfg.DemoTenantID,
	}
}

func BearerToken(c fiber.Ctx) string {
	auth := c.Get("authorization")
	if strings.HasPrefix(strings.ToLower(auth), "bearer ") {
		return strings.TrimSpace(auth[7:])
	}
	return ""
}

func BadRequest(c fiber.Ctx, message string) error {
	return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{Error: "INVALID_REQUEST", Message: message})
}

func NotFound(c fiber.Ctx, message string) error {
	return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{Error: "NOT_FOUND", Message: message})
}

func Unauthorized(c fiber.Ctx, message string) error {
	return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{Error: "UNAUTHORIZED", Message: message})
}

// PolloAuthHeader renders the Authorization header value Pollo expects.
// Per the Pollo AI API docs, the bearer token is sent as "Authorization:
// Bearer <POLLO_API_KEY>".
func PolloAuthHeader(apiKey string) string {
	return "Bearer " + strings.TrimSpace(apiKey)
}

// ProviderRequestID produces a stable, deterministic id for outbound
// provider calls. It is the hex-encoded SHA-256 of the concatenation of
// tenant_id, project_id and request_id (any of which may be empty).
// Using a hash means the same logical retry produces the same idempotency
// key on the provider side, satisfying the Idempotency-Key contract.
func ProviderRequestID(tenantID, projectID, requestID string) string {
	sum := sha256.Sum256([]byte(strings.Join([]string{tenantID, projectID, requestID}, "|")))
	return hex.EncodeToString(sum[:])
}
