package handler

import (
	"github.com/M1ralai/Kastonom/backend/internal/module/tenant/handler/dto"
	"github.com/gofiber/fiber/v3"
)

func RegisterRoutes(app *fiber.App) {
	app.Get("/login", loginReq)
	app.Post("/register", registerReq)
}

func loginReq(ctx fiber.Ctx) error {
	var r dto.LoginRequest

	if err := ctx.Bind().Body(&r); err != nil {
		return err
	}

	return nil
}

func registerReq(ctx fiber.Ctx) error {
	return nil
}
