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

// Create creates an iteration suggestion for a generated video.
// @Summary Create a creative iteration suggestion
// @Tags Iteration Suggestions
// @Accept json
// @Produce json
// @Param x-tenant-id header string false "Tenant ID"
// @Param request body dto.CreateIterationSuggestionRequest true "Iteration suggestion payload"
// @Success 201 {object} dto.CreateIterationSuggestionResponse
// @Failure 400 {object} httpx.ErrorResponse
// @Security TenantID
// @Router /creative-iteration-suggestions [post]
func (h *Handler) Create(c fiber.Ctx) error {
	var req dto.CreateIterationSuggestionRequest
	if err := c.Bind().Body(&req); err != nil {
		return httpx.BadRequest(c, "invalid iteration suggestion body")
	}
	res, err := h.service.Create(httpx.TenantContext(c, h.cfg), req)
	if err != nil {
		return httpx.BadRequest(c, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(res)
}
