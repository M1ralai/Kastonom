package handler

import (
	"github.com/M1ralai/Kastonom/backend/internal/modules/generation/dto"
	"github.com/M1ralai/Kastonom/backend/internal/modules/generation/service"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/httpx"
	"github.com/gofiber/fiber/v3"
)

type Handler struct {
	cfg     domain.AppConfig
	service service.GenerationRequestService
}

func New(cfg domain.AppConfig, service service.GenerationRequestService) *Handler {
	return &Handler{cfg: cfg, service: service}
}

func (h *Handler) RegisterRoutes(app *fiber.App) {
	app.Post("/generation-requests", h.Create)
	app.Post("/generation-requests/estimate-cost", h.EstimateCost)
}

// Create creates a generation request and video job.
// @Summary Create a generation request
// @Tags Generation Requests
// @Accept json
// @Produce json
// @Param x-tenant-id header string false "Tenant ID"
// @Param request body dto.CreateGenerationRequestRequest true "Generation request payload"
// @Success 202 {object} dto.GenerationRequestResponse
// @Failure 400 {object} httpx.ErrorResponse
// @Failure 404 {object} httpx.ErrorResponse
// @Security TenantID
// @Router /generation-requests [post]
func (h *Handler) Create(c fiber.Ctx) error {
	var req dto.CreateGenerationRequestRequest
	if err := c.Bind().Body(&req); err != nil {
		return httpx.BadRequest(c, "invalid generation request body")
	}
	res, ok, err := h.service.Create(httpx.TenantContext(c, h.cfg), req)
	if err != nil {
		return httpx.BadRequest(c, err.Error())
	}
	if !ok {
		return httpx.NotFound(c, "creative project was not found")
	}
	return c.Status(fiber.StatusAccepted).JSON(res)
}

// EstimateCost estimates generation credits and cost.
// @Summary Estimate generation cost
// @Tags Generation Requests
// @Accept json
// @Produce json
// @Param x-tenant-id header string false "Tenant ID"
// @Param request body dto.EstimateCostRequest true "Cost estimate payload"
// @Success 200 {object} dto.EstimateCostResponse
// @Failure 400 {object} httpx.ErrorResponse
// @Security TenantID
// @Router /generation-requests/estimate-cost [post]
func (h *Handler) EstimateCost(c fiber.Ctx) error {
	var req dto.EstimateCostRequest
	if err := c.Bind().Body(&req); err != nil {
		return httpx.BadRequest(c, "invalid estimate cost body")
	}
	return c.JSON(h.service.EstimateCost(httpx.TenantContext(c, h.cfg), req))
}
