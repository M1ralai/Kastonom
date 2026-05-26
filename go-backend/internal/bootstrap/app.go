package bootstrap

import (
	"time"

	"github.com/M1ralai/Kastonom/backend/internal/infrastructure/postgres"
	authhandler "github.com/M1ralai/Kastonom/backend/internal/modules/auth/handler"
	authrepo "github.com/M1ralai/Kastonom/backend/internal/modules/auth/repository"
	authservice "github.com/M1ralai/Kastonom/backend/internal/modules/auth/service"
	creativehandler "github.com/M1ralai/Kastonom/backend/internal/modules/creative/handler"
	creativerepo "github.com/M1ralai/Kastonom/backend/internal/modules/creative/repository"
	creativeservice "github.com/M1ralai/Kastonom/backend/internal/modules/creative/service"
	dashboardhandler "github.com/M1ralai/Kastonom/backend/internal/modules/dashboard/handler"
	dashboardrepo "github.com/M1ralai/Kastonom/backend/internal/modules/dashboard/repository"
	dashboardservice "github.com/M1ralai/Kastonom/backend/internal/modules/dashboard/service"
	demohandler "github.com/M1ralai/Kastonom/backend/internal/modules/demo/handler"
	demorepo "github.com/M1ralai/Kastonom/backend/internal/modules/demo/repository"
	demoservice "github.com/M1ralai/Kastonom/backend/internal/modules/demo/service"
	generationhandler "github.com/M1ralai/Kastonom/backend/internal/modules/generation/handler"
	generationrepo "github.com/M1ralai/Kastonom/backend/internal/modules/generation/repository"
	generationservice "github.com/M1ralai/Kastonom/backend/internal/modules/generation/service"
	iterationhandler "github.com/M1ralai/Kastonom/backend/internal/modules/iteration/handler"
	iterationrepo "github.com/M1ralai/Kastonom/backend/internal/modules/iteration/repository"
	iterationservice "github.com/M1ralai/Kastonom/backend/internal/modules/iteration/service"
	publicationhandler "github.com/M1ralai/Kastonom/backend/internal/modules/publication/handler"
	publicationrepo "github.com/M1ralai/Kastonom/backend/internal/modules/publication/repository"
	publicationservice "github.com/M1ralai/Kastonom/backend/internal/modules/publication/service"
	tenanthandler "github.com/M1ralai/Kastonom/backend/internal/modules/tenant/handler"
	tenantrepo "github.com/M1ralai/Kastonom/backend/internal/modules/tenant/repository"
	tenantservice "github.com/M1ralai/Kastonom/backend/internal/modules/tenant/service"
	videohandler "github.com/M1ralai/Kastonom/backend/internal/modules/video/handler"
	videorepo "github.com/M1ralai/Kastonom/backend/internal/modules/video/repository"
	videoservice "github.com/M1ralai/Kastonom/backend/internal/modules/video/service"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/gofiber/fiber/v3"
)

func NewApp() (*fiber.App, error) {
	cfg := domain.DefaultConfig()
	db, err := postgres.Open()
	if err != nil {
		return nil, err
	}
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
		err := db.Ping()
		if err != nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"status": "degraded", "checks": fiber.Map{"database": fiber.Map{"healthy": false, "error": err.Error()}}})
		}
		return c.JSON(fiber.Map{"status": "ok", "checks": fiber.Map{"database": fiber.Map{"healthy": true}}})
	})
	app.Get("/openapi.json", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{"openapi": "3.1.0", "info": fiber.Map{"title": "Kastonom Backend API", "version": cfg.Version}})
	})
	app.Get("/docs", func(c fiber.Ctx) error {
		c.Set("content-type", "text/html; charset=utf-8")
		return c.SendString("<!doctype html><title>Kastonom API</title><h1>Kastonom Go Backend</h1><p>OpenAPI: /openapi.json</p>")
	})

	authRepo := authrepo.New(db)
	authhandler.New(authservice.New(authRepo)).RegisterRoutes(app)

	tenantRepo := tenantrepo.New(db)
	tenanthandler.New(cfg, tenantservice.New(tenantRepo)).RegisterRoutes(app)

	creativeRepo := creativerepo.New(db)
	creativehandler.New(cfg, creativeservice.New(creativeRepo)).RegisterRoutes(app)

	generationRepo := generationrepo.New(db)
	generationhandler.New(cfg, generationservice.New(cfg, generationRepo)).RegisterRoutes(app)

	videoRepo := videorepo.New(db)
	videoService := videoservice.New(videoRepo)
	videohandler.New(cfg, videoService, videoService).RegisterRoutes(app)

	publicationRepo := publicationrepo.New(db)
	publicationService := publicationservice.New(publicationRepo)
	publicationhandler.New(cfg, publicationService, publicationService).RegisterRoutes(app)

	dashboardRepo := dashboardrepo.New(db)
	dashboardService := dashboardservice.New(dashboardRepo)
	dashboardhandler.New(cfg, dashboardService, dashboardService).RegisterRoutes(app)

	iterationRepo := iterationrepo.New(db)
	iterationhandler.New(cfg, iterationservice.New(iterationRepo)).RegisterRoutes(app)

	demoRepo := demorepo.New(db)
	demohandler.New(cfg, demoservice.New(demoRepo)).RegisterRoutes(app)

	return app, nil
}
