package dashboard

import (
	"strconv"

	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/httpx"
	"github.com/gofiber/fiber/v3"
)

type Handler struct {
	cfg    domain.AppConfig
	kpi    KpiSummaryService
	recent RecentActivitiesService
}

func NewHandler(cfg domain.AppConfig, kpi KpiSummaryService, recent RecentActivitiesService) *Handler {
	return &Handler{cfg: cfg, kpi: kpi, recent: recent}
}
func (h *Handler) RegisterRoutes(app *fiber.App) {
	app.Get("/dashboard/kpi-summary", h.GetKpiSummary)
	app.Get("/dashboard/recent-activities", h.GetRecentActivities)
}
func (h *Handler) GetKpiSummary(c fiber.Ctx) error {
	return c.JSON(h.kpi.GetSummary(httpx.TenantContext(c, h.cfg)))
}
func (h *Handler) GetRecentActivities(c fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	return c.JSON(h.recent.GetActivities(httpx.TenantContext(c, h.cfg), limit))
}
