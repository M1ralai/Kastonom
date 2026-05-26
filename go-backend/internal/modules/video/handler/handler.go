package handler

import (
	"github.com/M1ralai/Kastonom/backend/internal/modules/video/dto"
	"github.com/M1ralai/Kastonom/backend/internal/modules/video/service"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/httpx"
	"github.com/gofiber/fiber/v3"
)

type Handler struct {
	cfg    domain.AppConfig
	jobs   service.VideoJobService
	videos service.GeneratedVideoService
}

func New(cfg domain.AppConfig, jobs service.VideoJobService, videos service.GeneratedVideoService) *Handler {
	return &Handler{cfg: cfg, jobs: jobs, videos: videos}
}
func (h *Handler) RegisterRoutes(app *fiber.App) {
	app.Get("/video-jobs/:id", h.Get)
	app.Get("/video-jobs/:id/full", h.GetFull)
	app.Post("/generated-videos/:id/select", h.Select)
}
func (h *Handler) Get(c fiber.Ctx) error {
	res, ok, err := h.jobs.Get(httpx.TenantContext(c, h.cfg), c.Params("id"))
	if err != nil {
		return httpx.BadRequest(c, err.Error())
	}
	if !ok {
		return httpx.NotFound(c, "video job was not found")
	}
	return c.JSON(res)
}
func (h *Handler) GetFull(c fiber.Ctx) error {
	res, ok, err := h.jobs.GetFull(httpx.TenantContext(c, h.cfg), c.Params("id"))
	if err != nil {
		return httpx.BadRequest(c, err.Error())
	}
	if !ok {
		return httpx.NotFound(c, "video job was not found")
	}
	return c.JSON(res)
}
func (h *Handler) Select(c fiber.Ctx) error {
	var req dto.SelectGeneratedVideoRequest
	_ = c.Bind().Body(&req)
	res, ok, err := h.videos.Select(httpx.TenantContext(c, h.cfg), c.Params("id"), req)
	if err != nil {
		return httpx.BadRequest(c, err.Error())
	}
	if !ok {
		return httpx.NotFound(c, "generated video was not found")
	}
	return c.JSON(res)
}
