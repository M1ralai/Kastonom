package main

import (
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/infrastructure/validate"
	"github.com/M1ralai/Kastonom/backend/internal/middleware"
	"github.com/M1ralai/Kastonom/backend/internal/module/tenant/handler"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v3"
)

func main() {
	app := fiber.New(
		fiber.Config{
			StrictRouting: true,
			CaseSensitive: true,
			ReadTimeout:   5 * time.Second,
			WriteTimeout:  10 * time.Second,
			IdleTimeout:   3 * time.Minute,
			AppName:       "kastonom_dev",
			StructValidator: &validate.StructValidator{
				V: validator.New(),
			},
		},
	)

	app.Use("/api", middleware.Logger)

	handler.RegisterRoutes(app)

	app.Listen(":8080")
}
