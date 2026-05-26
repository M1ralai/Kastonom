package handler

import (
	"github.com/M1ralai/Kastonom/backend/internal/modules/creative/dto"
	"github.com/M1ralai/Kastonom/backend/internal/modules/creative/service"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/httpx"
	"github.com/gofiber/fiber/v3"
)

type Handler struct {
	cfg     domain.AppConfig
	service service.CreativeProjectService
}

func New(cfg domain.AppConfig, service service.CreativeProjectService) *Handler {
	return &Handler{cfg: cfg, service: service}
}

func (h *Handler) RegisterRoutes(app *fiber.App) {
	app.Post("/creative-projects", h.Create)
	app.Get("/creative-projects", h.List)
	app.Get("/creative-projects/:id", h.GetBundle)
	app.Get("/creative-projects/:id/metrics", h.GetMetrics)
	app.Post("/source-assets/upload", h.UploadSourceAsset)
}

// Create creates a creative project.
// @Summary Create a creative project
// @Tags Creative Projects
// @Accept json
// @Produce json
// @Param x-tenant-id header string false "Tenant ID"
// @Param request body dto.CreateCreativeProjectRequest true "Creative project payload"
// @Success 201 {object} dto.CreateCreativeProjectResponse
// @Failure 400 {object} httpx.ErrorResponse
// @Security TenantID
// @Router /creative-projects [post]
func (h *Handler) Create(c fiber.Ctx) error {
	var req dto.CreateCreativeProjectRequest
	if err := c.Bind().Body(&req); err != nil {
		return httpx.BadRequest(c, "invalid creative project body")
	}
	res, err := h.service.Create(httpx.TenantContext(c, h.cfg), req)
	if err != nil {
		return httpx.BadRequest(c, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(res)
}

// List returns creative projects for the tenant.
// @Summary List creative projects
// @Tags Creative Projects
// @Produce json
// @Param x-tenant-id header string false "Tenant ID"
// @Success 200 {array} domain.CreativeProject
// @Failure 400 {object} httpx.ErrorResponse
// @Security TenantID
// @Router /creative-projects [get]
func (h *Handler) List(c fiber.Ctx) error {
	res, err := h.service.List(httpx.TenantContext(c, h.cfg))
	if err != nil {
		return httpx.BadRequest(c, err.Error())
	}
	return c.JSON(res)
}

// GetBundle returns a creative project bundle.
// @Summary Get a creative project bundle
// @Tags Creative Projects
// @Produce json
// @Param x-tenant-id header string false "Tenant ID"
// @Param id path string true "Creative project ID"
// @Success 200 {object} dto.CreativeProjectBundleResponse
// @Failure 400 {object} httpx.ErrorResponse
// @Failure 404 {object} httpx.ErrorResponse
// @Security TenantID
// @Router /creative-projects/{id} [get]
func (h *Handler) GetBundle(c fiber.Ctx) error {
	res, ok, err := h.service.GetBundle(httpx.TenantContext(c, h.cfg), c.Params("id"))
	if err != nil {
		return httpx.BadRequest(c, err.Error())
	}
	if !ok {
		return httpx.NotFound(c, "creative project was not found")
	}
	return c.JSON(res)
}

// GetMetrics returns creative project metrics.
// @Summary Get creative project metrics
// @Tags Creative Projects
// @Produce json
// @Param x-tenant-id header string false "Tenant ID"
// @Param id path string true "Creative project ID"
// @Success 200 {object} dto.ProjectMetricsResponse
// @Failure 400 {object} httpx.ErrorResponse
// @Failure 404 {object} httpx.ErrorResponse
// @Security TenantID
// @Router /creative-projects/{id}/metrics [get]
func (h *Handler) GetMetrics(c fiber.Ctx) error {
	res, ok, err := h.service.GetMetrics(httpx.TenantContext(c, h.cfg), c.Params("id"))
	if err != nil {
		return httpx.BadRequest(c, err.Error())
	}
	if !ok {
		return httpx.NotFound(c, "creative project was not found")
	}
	return c.JSON(res)
}

// UploadSourceAsset creates a source asset upload target.
// @Summary Create a source asset upload
// @Tags Source Assets
// @Produce json
// @Param x-tenant-id header string false "Tenant ID"
// @Success 201 {object} dto.SourceAssetUploadResponse
// @Failure 400 {object} httpx.ErrorResponse
// @Security TenantID
// @Router /source-assets/upload [post]
func (h *Handler) UploadSourceAsset(c fiber.Ctx) error {
	res, err := h.service.UploadSourceAsset(httpx.TenantContext(c, h.cfg))
	if err != nil {
		return httpx.BadRequest(c, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(res)
}
