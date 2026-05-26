package generation

import (
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/httpx"
	"github.com/gofiber/fiber/v3"
)

type Handler struct {
	cfg     domain.AppConfig
	service GenerationRequestService
}

func NewHandler(cfg domain.AppConfig, service GenerationRequestService) *Handler {
	return &Handler{cfg: cfg, service: service}
}

func (h *Handler) RegisterRoutes(app *fiber.App) {
	app.Post("/generation-requests", h.Create)
	app.Post("/generation-requests/estimate-cost", h.EstimateCost)
}

func (h *Handler) Create(c fiber.Ctx) error {
	var req CreateGenerationRequestRequest
	if err := c.Bind().Body(&req); err != nil {
		return httpx.BadRequest(c, "invalid generation request body")
	}
	res, ok := h.service.Create(httpx.TenantContext(c, h.cfg), req)
	if !ok {
		return httpx.NotFound(c, "creative project was not found")
	}
	return c.Status(fiber.StatusAccepted).JSON(res)
}

func (h *Handler) EstimateCost(c fiber.Ctx) error {
	var req EstimateCostRequest
	_ = c.Bind().Body(&req)
	return c.JSON(h.service.EstimateCost(httpx.TenantContext(c, h.cfg), req))
}
