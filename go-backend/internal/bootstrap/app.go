package bootstrap

import (
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/modules/auth"
	"github.com/M1ralai/Kastonom/backend/internal/modules/creative"
	"github.com/M1ralai/Kastonom/backend/internal/modules/dashboard"
	"github.com/M1ralai/Kastonom/backend/internal/modules/demo"
	"github.com/M1ralai/Kastonom/backend/internal/modules/generation"
	"github.com/M1ralai/Kastonom/backend/internal/modules/iteration"
	"github.com/M1ralai/Kastonom/backend/internal/modules/publication"
	"github.com/M1ralai/Kastonom/backend/internal/modules/tenant"
	"github.com/M1ralai/Kastonom/backend/internal/modules/video"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/store"
	"github.com/gofiber/fiber/v3"
)

func NewApp() *fiber.App {
	cfg := domain.DefaultConfig()
	app := fiber.New(fiber.Config{
		StrictRouting: true,
		CaseSensitive: true,
		ReadTimeout:   5 * time.Second,
		WriteTimeout:  10 * time.Second,
		IdleTimeout:   3 * time.Minute,
		AppName:       "kastonom-go",
	})

	app.Use(func(c fiber.Ctx) error {
		c.Set("access-control-allow-origin", "*")
		c.Set("access-control-allow-methods", "GET,POST,OPTIONS")
		c.Set("access-control-allow-headers", "content-type,x-tenant-id,x-request-id,authorization")
		if c.Method() == fiber.MethodOptions {
			return c.SendStatus(fiber.StatusNoContent)
		}
		return c.Next()
	})

	app.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":                   "ok",
			"mode":                     cfg.Mode,
			"version":                  cfg.Version,
			"video_provider_readiness": fiber.Map{"mock": domain.ReadinessStatus{Ready: true, Mode: cfg.Mode, IsMock: true}},
			"ad_platform_readiness":    fiber.Map{"meta_ads": domain.ReadinessStatus{Ready: true, Mode: cfg.Mode, IsMock: true}, "google_ads": domain.ReadinessStatus{Ready: true, Mode: cfg.Mode, IsMock: true}},
		})
	})
	app.Get("/health/ready", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "checks": fiber.Map{"database": fiber.Map{"healthy": true}}})
	})
	app.Get("/openapi.json", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{"openapi": "3.1.0", "info": fiber.Map{"title": "Kastonom Backend API", "version": cfg.Version}})
	})
	app.Get("/docs", func(c fiber.Ctx) error {
		c.Set("content-type", "text/html; charset=utf-8")
		return c.SendString("<!doctype html><title>Kastonom API</title><h1>Kastonom Go Backend</h1><p>OpenAPI: /openapi.json</p>")
	})

	memory := store.New()

	authRepo := auth.NewRepository(memory)
	auth.NewHandler(auth.NewService(authRepo)).RegisterRoutes(app)

	tenantRepo := tenant.NewRepository(memory)
	tenant.NewHandler(cfg, tenant.NewService(tenantRepo)).RegisterRoutes(app)

	creativeRepo := creative.NewRepository(memory)
	creative.NewHandler(cfg, creative.NewService(creativeRepo)).RegisterRoutes(app)

	generationRepo := generation.NewRepository(memory)
	generation.NewHandler(cfg, generation.NewService(cfg, generationRepo)).RegisterRoutes(app)

	videoRepo := video.NewRepository(memory)
	videoService := video.NewService(videoRepo)
	video.NewHandler(cfg, videoService, videoService).RegisterRoutes(app)

	publicationRepo := publication.NewRepository(memory)
	publicationService := publication.NewService(publicationRepo)
	publication.NewHandler(cfg, publicationService, publicationService).RegisterRoutes(app)

	dashboardRepo := dashboard.NewRepository(memory)
	dashboardService := dashboard.NewService(dashboardRepo)
	dashboard.NewHandler(cfg, dashboardService, dashboardService).RegisterRoutes(app)

	iterationRepo := iteration.NewRepository(memory)
	iteration.NewHandler(cfg, iteration.NewService(iterationRepo)).RegisterRoutes(app)

	demoRepo := demo.NewRepository(memory)
	demo.NewHandler(cfg, demo.NewService(demoRepo)).RegisterRoutes(app)

	return app
}
