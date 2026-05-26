package handler

import (
	"github.com/M1ralai/Kastonom/backend/internal/modules/publication/dto"
	"github.com/M1ralai/Kastonom/backend/internal/modules/publication/service"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/httpx"
	"github.com/gofiber/fiber/v3"
)

type Handler struct {
	cfg          domain.AppConfig
	publications service.AdPublicationService
	metrics      service.MetricsService
}

func New(cfg domain.AppConfig, publications service.AdPublicationService, metrics service.MetricsService) *Handler {
	return &Handler{cfg: cfg, publications: publications, metrics: metrics}
}
func (h *Handler) RegisterRoutes(app *fiber.App) {
	app.Post("/ad-publications", h.Create)
	app.Post("/ad-publications/:id/metrics/sync", h.SyncMetrics)
}

// Create publishes a selected generated video to an ad platform.
// @Summary Create an ad publication
// @Tags Ad Publications
// @Accept json
// @Produce json
// @Param x-tenant-id header string false "Tenant ID"
// @Param request body dto.CreateAdPublicationRequest true "Ad publication payload"
// @Success 201 {object} dto.CreateAdPublicationResponse
// @Failure 400 {object} httpx.ErrorResponse
// @Failure 404 {object} httpx.ErrorResponse
// @Security TenantID
// @Router /ad-publications [post]
func (h *Handler) Create(c fiber.Ctx) error {
	var req dto.CreateAdPublicationRequest
	if err := c.Bind().Body(&req); err != nil {
		return httpx.BadRequest(c, "invalid ad publication body")
	}
	res, ok, err := h.publications.Create(httpx.TenantContext(c, h.cfg), req)
	if err != nil {
		return httpx.BadRequest(c, err.Error())
	}
	if !ok {
		return httpx.NotFound(c, "generated video was not found")
	}
	return c.Status(fiber.StatusCreated).JSON(res)
}

// SyncMetrics stores metrics for an ad publication.
// @Summary Sync ad publication metrics
// @Tags Ad Publications
// @Accept json
// @Produce json
// @Param x-tenant-id header string false "Tenant ID"
// @Param id path string true "Ad publication ID"
// @Param request body dto.SyncMetricsRequest true "Metrics sync payload"
// @Success 201 {object} dto.SyncMetricsResponse
// @Failure 400 {object} httpx.ErrorResponse
// @Failure 404 {object} httpx.ErrorResponse
// @Security TenantID
// @Router /ad-publications/{id}/metrics/sync [post]
func (h *Handler) SyncMetrics(c fiber.Ctx) error {
	var req dto.SyncMetricsRequest
	if err := c.Bind().Body(&req); err != nil {
		return httpx.BadRequest(c, "invalid metrics sync body")
	}
	res, ok, err := h.metrics.Sync(httpx.TenantContext(c, h.cfg), c.Params("id"), req)
	if err != nil {
		return httpx.BadRequest(c, err.Error())
	}
	if !ok {
		return httpx.NotFound(c, "ad publication was not found")
	}
	return c.Status(fiber.StatusCreated).JSON(res)
}
