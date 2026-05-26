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
