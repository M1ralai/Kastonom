package handler

import "github.com/gofiber/fiber/v3"

func RegisterRoutes(app *fiber.App) {
	app.Get("/login", loginReq)
	app.Post("/register", registerReq)
}

func loginReq(ctx fiber.Ctx) error {
	return nil
}
func registerReq(ctx fiber.Ctx) error {
	return nil
}
