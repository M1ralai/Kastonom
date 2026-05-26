package tenant

import (
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/httpx"
	"github.com/gofiber/fiber/v3"
)

type Handler struct {
	cfg     domain.AppConfig
	service TenantService
}

func NewHandler(cfg domain.AppConfig, service TenantService) *Handler {
	return &Handler{cfg: cfg, service: service}
}

func (h *Handler) RegisterRoutes(app *fiber.App) {
	app.Get("/tenant", h.GetDetails)
	app.Get("/tenant/credits", h.GetCredits)
}

func (h *Handler) GetDetails(c fiber.Ctx) error {
	res, ok := h.service.GetDetails(httpx.TenantContext(c, h.cfg))
	if !ok {
		return httpx.NotFound(c, "tenant was not found")
	}
	return c.JSON(res)
}

func (h *Handler) GetCredits(c fiber.Ctx) error {
	return c.JSON(h.service.GetCredits(httpx.TenantContext(c, h.cfg)))
}
