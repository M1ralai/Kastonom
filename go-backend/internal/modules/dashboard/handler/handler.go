package handler

import (
	"strconv"

	"github.com/M1ralai/Kastonom/backend/internal/modules/dashboard/service"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/httpx"
	"github.com/gofiber/fiber/v3"
)

type Handler struct {
	cfg    domain.AppConfig
	kpi    service.KpiSummaryService
	recent service.RecentActivitiesService
}

func New(cfg domain.AppConfig, kpi service.KpiSummaryService, recent service.RecentActivitiesService) *Handler {
	return &Handler{cfg: cfg, kpi: kpi, recent: recent}
}
func (h *Handler) RegisterRoutes(app *fiber.App) {
	app.Get("/dashboard/kpi-summary", h.GetKpiSummary)
	app.Get("/dashboard/recent-activities", h.GetRecentActivities)
}
func (h *Handler) GetKpiSummary(c fiber.Ctx) error {
	res, err := h.kpi.GetSummary(httpx.TenantContext(c, h.cfg))
	if err != nil {
		return httpx.BadRequest(c, err.Error())
	}
	return c.JSON(res)
}
func (h *Handler) GetRecentActivities(c fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	res, err := h.recent.GetActivities(httpx.TenantContext(c, h.cfg), limit)
	if err != nil {
		return httpx.BadRequest(c, err.Error())
	}
	return c.JSON(res)
}
