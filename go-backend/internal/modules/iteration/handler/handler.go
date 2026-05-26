package handler

import (
	"github.com/M1ralai/Kastonom/backend/internal/modules/iteration/dto"
	"github.com/M1ralai/Kastonom/backend/internal/modules/iteration/service"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/httpx"
	"github.com/gofiber/fiber/v3"
)

type Handler struct {
	cfg     domain.AppConfig
	service service.IterationSuggestionService
}

func New(cfg domain.AppConfig, service service.IterationSuggestionService) *Handler {
	return &Handler{cfg: cfg, service: service}
}
func (h *Handler) RegisterRoutes(app *fiber.App) {
	app.Post("/creative-iteration-suggestions", h.Create)
}
func (h *Handler) Create(c fiber.Ctx) error {
	var req dto.CreateIterationSuggestionRequest
	_ = c.Bind().Body(&req)
	res, err := h.service.Create(httpx.TenantContext(c, h.cfg), req)
	if err != nil {
		return httpx.BadRequest(c, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(res)
}
