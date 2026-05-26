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

func (h *Handler) List(c fiber.Ctx) error {
	res, err := h.service.List(httpx.TenantContext(c, h.cfg))
	if err != nil {
		return httpx.BadRequest(c, err.Error())
	}
	return c.JSON(res)
}

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

func (h *Handler) UploadSourceAsset(c fiber.Ctx) error {
	res, err := h.service.UploadSourceAsset(httpx.TenantContext(c, h.cfg))
	if err != nil {
		return httpx.BadRequest(c, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(res)
}
