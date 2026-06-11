// Package handler implements the demo-fallback HTTP handler.
//
// INTENT (Phase 3 migration, domain: demo-fallback):
//
//	This module is INTENTIONALLY PRESERVED as the offline/Pollo-down
//	replay path. The /demo/fallback route is the last-resort endpoint
//	that the dashboard/publication layers call when the real provider
//	flow is unavailable. The module is scheduled for later deletion,
//	but its interface contract must remain stable so that:
//	  - RegisterRoutes registers /demo/fallback as a GET on the supplied
//	    *fiber.App,
//	  - Fallback(c fiber.Ctx) error remains the only entry point,
//	  - New(cfg, service) signature is unchanged for bootstrap wiring.
//
// DO NOT:
//   - Swap Fallback's body for a real Pollo HTTP call.
//   - Change New's signature or RegisterRoutes' semantics.
//   - Change the HTTP method or path.
package handler

import (
	"github.com/M1ralai/Kastonom/backend/internal/modules/demo/service"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/httpx"
	"github.com/gofiber/fiber/v3"
)

type Handler struct {
	cfg     domain.AppConfig
	service service.DemoReplayService
}

func New(cfg domain.AppConfig, service service.DemoReplayService) *Handler {
	return &Handler{cfg: cfg, service: service}
}
func (h *Handler) RegisterRoutes(app *fiber.App) { app.Get("/demo/fallback", h.Fallback) }

// Fallback returns a demo fallback replay payload.
// @Summary Get demo fallback payload
// @Tags Demo
// @Produce json
// @Param x-tenant-id header string false "Tenant ID"
// @Success 200 {object} DemoFallbackResponse
// @Failure 400 {object} httpx.ErrorResponse
// @Security TenantID
// @Router /demo/fallback [get]
func (h *Handler) Fallback(c fiber.Ctx) error {
	res, err := h.service.Fallback(httpx.TenantContext(c, h.cfg))
	if err != nil {
		return httpx.BadRequest(c, err.Error())
	}
	return c.JSON(res)
}
