package handler

import (
	"github.com/M1ralai/Kastonom/backend/internal/modules/tenant/service"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/httpx"
	"github.com/gofiber/fiber/v3"
)

type Handler struct {
	cfg     domain.AppConfig
	service service.TenantService
}

func New(cfg domain.AppConfig, service service.TenantService) *Handler {
	return &Handler{cfg: cfg, service: service}
}

func (h *Handler) RegisterRoutes(app *fiber.App) {
	app.Get("/tenant", h.GetDetails)
	app.Get("/tenant/credits", h.GetCredits)
}

func (h *Handler) GetDetails(c fiber.Ctx) error {
	res, ok, err := h.service.GetDetails(httpx.TenantContext(c, h.cfg))
	if err != nil {
		return httpx.BadRequest(c, err.Error())
	}
	if !ok {
		return httpx.NotFound(c, "tenant was not found")
	}
	return c.JSON(res)
}

func (h *Handler) GetCredits(c fiber.Ctx) error {
	res, err := h.service.GetCredits(httpx.TenantContext(c, h.cfg))
	if err != nil {
		return httpx.BadRequest(c, err.Error())
	}
	return c.JSON(res)
}
