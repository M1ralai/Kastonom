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
	app.Post("/video-jobs/:id/cancel", h.Cancel)
	app.Post("/generated-videos/:id/select", h.Select)
}

// Get returns video job status and generated videos.
// @Summary Get a video job
// @Tags Video Jobs
// @Produce json
// @Param x-tenant-id header string false "Tenant ID"
// @Param id path string true "Video job ID"
// @Success 200 {object} dto.VideoJobResponse
// @Failure 400 {object} httpx.ErrorResponse
// @Failure 404 {object} httpx.ErrorResponse
// @Security TenantID
// @Router /video-jobs/{id} [get]
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

// GetFull returns expanded video job context.
// @Summary Get full video job details
// @Tags Video Jobs
// @Produce json
// @Param x-tenant-id header string false "Tenant ID"
// @Param id path string true "Video job ID"
// @Success 200 {object} dto.FullVideoJobResponse
// @Failure 400 {object} httpx.ErrorResponse
// @Failure 404 {object} httpx.ErrorResponse
// @Security TenantID
// @Router /video-jobs/{id}/full [get]
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

// Select marks a generated video as selected for a project.
// @Summary Select a generated video
// @Tags Generated Videos
// @Accept json
// @Produce json
// @Param x-tenant-id header string false "Tenant ID"
// @Param id path string true "Generated video ID"
// @Param request body dto.SelectGeneratedVideoRequest true "Generated video selection payload"
// @Success 200 {object} dto.SelectGeneratedVideoResponse
// @Failure 400 {object} httpx.ErrorResponse
// @Failure 404 {object} httpx.ErrorResponse
// @Security TenantID
// @Router /generated-videos/{id}/select [post]
func (h *Handler) Select(c fiber.Ctx) error {
	var req dto.SelectGeneratedVideoRequest
	if err := c.Bind().Body(&req); err != nil {
		return httpx.BadRequest(c, "invalid generated video selection body")
	}
	res, ok, err := h.videos.Select(httpx.TenantContext(c, h.cfg), c.Params("id"), req)
	if err != nil {
		return httpx.BadRequest(c, err.Error())
	}
	if !ok {
		return httpx.NotFound(c, "generated video was not found")
	}
	return c.JSON(res)
}

// Cancel transitions a video job to status='canceled' if it is in a
// non-terminal state. Returns 200 with the updated job on success, 409
// when the job is already in a terminal state (completed/failed/canceled).
// A 404 (via the bad-request fallback when ok=false but err==nil) covers
// both "no such job" and "job is terminal" — the frontend uses the
// returned body to distinguish.
//
// @Summary Cancel a video job
// @Description Transitions a video job to the canceled state. The job must currently be in queued, submitted, or processing; terminal jobs return 409.
// @Tags Video Jobs
// @Produce json
// @Param x-tenant-id header string false "Tenant ID"
// @Param id path string true "Video job ID"
// @Success 200 {object} dto.VideoJobResponse
// @Failure 404 {object} httpx.ErrorResponse
// @Failure 409 {object} httpx.ErrorResponse
// @Security TenantID
// @Router /video-jobs/{id}/cancel [post]
func (h *Handler) Cancel(c fiber.Ctx) error {
	res, ok, err := h.jobs.Cancel(httpx.TenantContext(c, h.cfg), c.Params("id"))
	if err != nil {
		return httpx.BadRequest(c, err.Error())
	}
	if !ok {
		return c.Status(fiber.StatusConflict).JSON(httpx.ErrorResponse{
			Error:   "TERMINAL_STATE",
			Message: "video job is in a terminal state and cannot be canceled",
		})
	}
	return c.JSON(res)
}
