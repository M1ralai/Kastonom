package publication

import (
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/httpx"
	"github.com/gofiber/fiber/v3"
)

type Handler struct {
	cfg          domain.AppConfig
	publications AdPublicationService
	metrics      MetricsService
}

func NewHandler(cfg domain.AppConfig, publications AdPublicationService, metrics MetricsService) *Handler {
	return &Handler{cfg: cfg, publications: publications, metrics: metrics}
}
func (h *Handler) RegisterRoutes(app *fiber.App) {
	app.Post("/ad-publications", h.Create)
	app.Post("/ad-publications/:id/metrics/sync", h.SyncMetrics)
}
func (h *Handler) Create(c fiber.Ctx) error {
	var req CreateAdPublicationRequest
	_ = c.Bind().Body(&req)
	res, ok := h.publications.Create(httpx.TenantContext(c, h.cfg), req)
	if !ok {
		return httpx.NotFound(c, "generated video was not found")
	}
	return c.Status(fiber.StatusCreated).JSON(res)
}
func (h *Handler) SyncMetrics(c fiber.Ctx) error {
	var req SyncMetricsRequest
	_ = c.Bind().Body(&req)
	res, ok := h.metrics.Sync(httpx.TenantContext(c, h.cfg), c.Params("id"), req)
	if !ok {
		return httpx.NotFound(c, "ad publication was not found")
	}
	return c.Status(fiber.StatusCreated).JSON(res)
}
