package demo

import (
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/httpx"
	"github.com/gofiber/fiber/v3"
)

type Handler struct {
	cfg     domain.AppConfig
	service DemoReplayService
}

func NewHandler(cfg domain.AppConfig, service DemoReplayService) *Handler {
	return &Handler{cfg: cfg, service: service}
}
func (h *Handler) RegisterRoutes(app *fiber.App) { app.Get("/demo/fallback", h.Fallback) }
func (h *Handler) Fallback(c fiber.Ctx) error {
	return c.JSON(h.service.Fallback(httpx.TenantContext(c, h.cfg)))
}
