package iteration

import (
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/httpx"
	"github.com/gofiber/fiber/v3"
)

type Handler struct {
	cfg     domain.AppConfig
	service IterationSuggestionService
}

func NewHandler(cfg domain.AppConfig, service IterationSuggestionService) *Handler {
	return &Handler{cfg: cfg, service: service}
}
func (h *Handler) RegisterRoutes(app *fiber.App) {
	app.Post("/creative-iteration-suggestions", h.Create)
}
func (h *Handler) Create(c fiber.Ctx) error {
	var req CreateIterationSuggestionRequest
	_ = c.Bind().Body(&req)
	return c.Status(fiber.StatusCreated).JSON(h.service.Create(httpx.TenantContext(c, h.cfg), req))
}
