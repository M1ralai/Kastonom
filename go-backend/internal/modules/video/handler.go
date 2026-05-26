package video

import (
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/httpx"
	"github.com/gofiber/fiber/v3"
)

type Handler struct {
	cfg    domain.AppConfig
	jobs   VideoJobService
	videos GeneratedVideoService
}

func NewHandler(cfg domain.AppConfig, jobs VideoJobService, videos GeneratedVideoService) *Handler {
	return &Handler{cfg: cfg, jobs: jobs, videos: videos}
}
func (h *Handler) RegisterRoutes(app *fiber.App) {
	app.Get("/video-jobs/:id", h.Get)
	app.Get("/video-jobs/:id/full", h.GetFull)
	app.Post("/generated-videos/:id/select", h.Select)
}
func (h *Handler) Get(c fiber.Ctx) error {
	res, ok := h.jobs.Get(httpx.TenantContext(c, h.cfg), c.Params("id"))
	if !ok {
		return httpx.NotFound(c, "video job was not found")
	}
	return c.JSON(res)
}
func (h *Handler) GetFull(c fiber.Ctx) error {
	res, ok := h.jobs.GetFull(httpx.TenantContext(c, h.cfg), c.Params("id"))
	if !ok {
		return httpx.NotFound(c, "video job was not found")
	}
	return c.JSON(res)
}
func (h *Handler) Select(c fiber.Ctx) error {
	var req SelectGeneratedVideoRequest
	_ = c.Bind().Body(&req)
	res, ok := h.videos.Select(httpx.TenantContext(c, h.cfg), c.Params("id"), req)
	if !ok {
		return httpx.NotFound(c, "generated video was not found")
	}
	return c.JSON(res)
}
