package auth

import (
	"github.com/M1ralai/Kastonom/backend/internal/shared/httpx"
	"github.com/gofiber/fiber/v3"
)

type Handler struct {
	service AuthService
}

func NewHandler(service AuthService) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(app *fiber.App) {
	app.Post("/auth/register", h.Register)
	app.Post("/auth/login", h.Login)
	app.Post("/auth/refresh", h.Refresh)
	app.Post("/auth/logout", h.Logout)
}

func (h *Handler) Register(c fiber.Ctx) error {
	var req RegisterRequest
	if err := c.Bind().Body(&req); err != nil {
		return httpx.BadRequest(c, "invalid register body")
	}
	res, err := h.service.Register(req)
	if err != nil {
		return httpx.BadRequest(c, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(res)
}

func (h *Handler) Login(c fiber.Ctx) error {
	var req LoginRequest
	if err := c.Bind().Body(&req); err != nil {
		return httpx.BadRequest(c, "invalid login body")
	}
	res, err := h.service.Login(req)
	if err != nil {
		return httpx.Unauthorized(c, "invalid email or password")
	}
	return c.JSON(res)
}

func (h *Handler) Refresh(c fiber.Ctx) error {
	var req RefreshTokenRequest
	_ = c.Bind().Body(&req)
	res, _ := h.service.RefreshToken(req)
	return c.JSON(res)
}

func (h *Handler) Logout(c fiber.Ctx) error {
	var req LogoutRequest
	_ = c.Bind().Body(&req)
	res, _ := h.service.Logout(req)
	return c.JSON(res)
}
