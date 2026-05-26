package handler

import (
	"github.com/M1ralai/Kastonom/backend/internal/modules/auth/dto"
	"github.com/M1ralai/Kastonom/backend/internal/modules/auth/service"
	"github.com/M1ralai/Kastonom/backend/internal/shared/httpx"
	"github.com/gofiber/fiber/v3"
)

type Handler struct {
	service service.AuthService
}

func New(service service.AuthService) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(app *fiber.App) {
	app.Post("/auth/register", h.Register)
	app.Post("/auth/login", h.Login)
	app.Post("/auth/refresh", h.Refresh)
	app.Post("/auth/logout", h.Logout)
}

func (h *Handler) Register(c fiber.Ctx) error {
	var req dto.RegisterRequest
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
	var req dto.LoginRequest
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
	var req dto.RefreshTokenRequest
	if err := c.Bind().Body(&req); err != nil {
		return httpx.BadRequest(c, "invalid refresh token body")
	}
	res, _ := h.service.RefreshToken(req)
	return c.JSON(res)
}

func (h *Handler) Logout(c fiber.Ctx) error {
	var req dto.LogoutRequest
	if err := c.Bind().Body(&req); err != nil {
		return httpx.BadRequest(c, "invalid logout body")
	}
	res, _ := h.service.Logout(req)
	return c.JSON(res)
}
