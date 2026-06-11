package bootstrap

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/jmoiron/sqlx"

	_ "github.com/M1ralai/Kastonom/backend/docs"
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
	"github.com/M1ralai/Kastonom/backend/internal/provider/pollo"
	"github.com/M1ralai/Kastonom/backend/internal/shared/domain"
	"github.com/M1ralai/Kastonom/backend/internal/shared/health"
	"github.com/M1ralai/Kastonom/backend/internal/shared/logging"
	"github.com/M1ralai/Kastonom/backend/internal/shared/validation"
	swaggo "github.com/gofiber/contrib/v3/swaggo"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/static"
)

func NewApp() (*fiber.App, error) {
	cfg := domain.DefaultConfig()
	db, err := postgres.Open()
	if err != nil {
		return nil, err
	}
	return NewTestAppWithDB(cfg, db)
}

// NewTestApp builds a Fiber app identical to the one NewApp() returns
// but lets the caller inject the *sqlx.DB (or pass nil for tests that
// only exercise non-DB endpoints such as /health, /uploads/*).
//
// When db is nil the per-module handler registrations are skipped; the
// returned app still wires the global middleware stack (/health,
// /health/ready, CORS, logging, /openapi.json, /docs, /swagger/*,
// /uploads/* static mount). The production signature NewApp() is
// unchanged; NewTestApp is a sibling constructor for test code.
func NewTestApp(db *sqlx.DB) (*fiber.App, error) {
	return NewTestAppWithDB(domain.DefaultConfig(), db)
}

// NewTestAppWithDB is the full-control variant of NewTestApp: it lets
// the caller pass an explicit AppConfig (useful for tests that want to
// override Mode, PolloAPIKey, UploadDir, etc.) and an explicit
// *sqlx.DB. Pass db=nil to skip DB-dependent handler registrations.
func NewTestAppWithDB(cfg domain.AppConfig, db *sqlx.DB) (*fiber.App, error) {
	// Ensure the upload directory exists before app.Static registers so
	// the very first request does not race a missing directory.
	if cfg.UploadDir == "" {
		cfg.UploadDir = "./uploads"
	}
	if err := os.MkdirAll(cfg.UploadDir, 0o755); err != nil {
		return nil, fmt.Errorf("bootstrap: create upload dir %q: %w", cfg.UploadDir, err)
	}

	// Construct the shared Pollo client up front so /health and every
	// module can use the same connection pool. The client itself is
	// provider-neutral (no calls happen yet); it only dials the network
	// when a real call is made.
	polloClient := pollo.NewClient(pollo.FromAppConfig(cfg)).WithSecrets(pollo.SecretConfig{WebhookSecret: cfg.PolloWebhookSecret})
	healthProbe := health.NewWithPollo(cfg, polloClient)

	app := fiber.New(fiber.Config{
		StrictRouting:   true,
		CaseSensitive:   true,
		ReadTimeout:     5 * time.Second,
		WriteTimeout:    10 * time.Second,
		IdleTimeout:     3 * time.Minute,
		AppName:         "kastonom-go",
		StructValidator: validation.NewStructValidator(),
	})

	app.Use(logging.ErrorMiddleware())

	app.Use(func(c fiber.Ctx) error {
		c.Set("access-control-allow-origin", "*")
		c.Set("access-control-allow-methods", "GET,POST,OPTIONS")
		c.Set("access-control-allow-headers", "content-type,x-tenant-id,x-request-id,authorization")
		if c.Method() == fiber.MethodOptions {
			return c.SendStatus(fiber.StatusNoContent)
		}
		return c.Next()
	})

	app.Get("/health", newHealthHandler(healthProbe))
	if db != nil {
		app.Get("/health/ready", newReadinessHandler(db))
	}
	app.Get("/openapi.json", newOpenAPIHandler())
	app.Get("/docs", func(c fiber.Ctx) error {
		return c.Redirect().To("/swagger/index.html")
	})
	app.Get("/swagger/*", swaggo.New(swaggo.Config{
		Title: "Kastonom Backend API",
		URL:   "/swagger/doc.json",
	}))

	// Static mount for user-uploaded assets (e.g. demo_or_mock_service
	// writes to /uploads/mock-upload.png). The directory is guaranteed
	// to exist by the MkdirAll call above. fiber v3 exposes the
	// static-serving middleware as a separate package, not as
	// app.Static; we wire it as Use("/uploads", static.New(dir)).
	app.Use("/uploads", static.New(cfg.UploadDir))

	// DB-dependent module wiring. When db is nil the per-module
	// handlers are skipped; cross-cutting endpoints (health, uploads,
	// docs) still work for tests that do not need a real database.
	if db == nil {
		return app, nil
	}

	authRepo := authrepo.New(db)
	authhandler.New(authservice.New(authRepo)).RegisterRoutes(app)

	tenantRepo := tenantrepo.New(db)
	tenanthandler.New(cfg, tenantservice.New(tenantRepo)).RegisterRoutes(app)

	creativeRepo := creativerepo.NewWithPollo(db, polloClient, cfg.Mode)
	creativehandler.New(cfg, creativeservice.NewWithPollo(creativeRepo, cfg, polloClient)).RegisterRoutes(app)

	generationRepo := generationrepo.New(db)
	// Wire the real Pollo client into the generation service. When the
	// mode is "mock" or POLLO_API_KEY is empty the service falls through
	// to the offline demo branch automatically (see
	// Service.createDemoOrMockGeneration).
	generationhandler.New(cfg, generationservice.NewWithPollo(cfg, generationRepo, polloClient)).RegisterRoutes(app)

	videoRepo := videorepo.New(db)
	videoService := videoservice.New(videoRepo)
	videohandler.New(cfg, videoService, videoService).RegisterRoutes(app)

	publicationRepo := publicationrepo.New(db)
	publicationService := publicationservice.New(publicationRepo)
	publicationhandler.New(cfg, publicationService, publicationService).RegisterRoutes(app)

	dashboardRepo := dashboardrepo.New(db)
	dashboardService := dashboardservice.New(dashboardRepo)
	dashboardhandler.New(cfg, dashboardService, dashboardService).RegisterRoutes(app)

	iterationRepo := iterationrepo.NewWithPollo(db, polloClient, cfg.Mode != "mock")
	iterationhandler.New(cfg, iterationservice.New(iterationRepo)).RegisterRoutes(app)

	demoRepo := demorepo.New(db)
	demohandler.New(cfg, demoservice.New(demoRepo)).RegisterRoutes(app)

	return app, nil
}

// Package-level state used by the Health / Readiness / OpenAPISpec
// Fiber handlers. They are initialized once in NewApp() via the
// matching *Handler constructors below and read by the top-level
// handler functions. Exposing the actual handler bodies as named
// top-level functions lets swag's comment-based route discovery attach
// @Router annotations to the function that owns the route; swag does
// not parse annotations on a factory that returns a closure.
var (
	healthProbeRef *health.Probe
	dbRef          *sqlx.DB
)

// Health is the Fiber handler for GET /health. It runs the configured
// readiness probe under a 5-second wall-clock budget; each individual
// ad-platform check inside the probe is itself capped at 3s.
//
// @Summary       Aggregate readiness probe
// @Description   Returns the readiness state of the video provider and every configured ad platform. The probe performs a real Pollo auth-key ping and a transport-level reachability check for each platform; in mock mode every component is reported as ready with is_mock=true.
// @Tags          Health
// @Produce       json
// @Success       200 {object} health.Report "Readiness report"
// @Router        /health [get]
func Health(c fiber.Ctx) error {
	probeCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return c.JSON(healthProbeRef.Check(probeCtx))
}

// Readiness is the Fiber handler for GET /health/ready. It performs a
// lightweight Ping against the database and reports a 503 with
// diagnostic detail when the database is unreachable so the endpoint
// can be wired to a Kubernetes readinessProbe.
//
// @Summary       Liveness/readiness check for the database
// @Description   Pings the database and returns 200 with status=ok when reachable, or 503 with a diagnostic payload when not. Intended for Kubernetes liveness/readiness probes.
// @Tags          Health
// @Produce       json
// @Success       200 {object} map[string]interface{} "status=ok"
// @Failure       503 {object} map[string]interface{} "status=degraded, db error attached"
// @Router        /health/ready [get]
func Readiness(c fiber.Ctx) error {
	if err := dbRef.Ping(); err != nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"status": "degraded",
			"checks": fiber.Map{"database": fiber.Map{"healthy": false, "error": err.Error()}},
		})
	}
	return c.JSON(fiber.Map{
		"status": "ok",
		"checks": fiber.Map{"database": fiber.Map{"healthy": true}},
	})
}

// OpenAPISpec is the Fiber handler for GET /openapi.json. It serves
// the generated OpenAPI 2.0 spec produced by `swag init`.
//
// @Summary       Serve the generated OpenAPI spec
// @Description   Serves docs/swagger.json (the file produced by `swag init`) under the conventional /openapi.json path. Returns 404 with a remediation hint when the spec is missing so operators do not silently serve a stale document.
// @Tags          Docs
// @Produce       json
// @Success       200 {object} map[string]interface{} "OpenAPI 2.0 spec"
// @Failure       404 {object} map[string]interface{} "Spec missing - run swag init"
// @Router        /openapi.json [get]
func OpenAPISpec(c fiber.Ctx) error {
	candidates := []string{
		filepath.Join("docs", "swagger.json"),
		filepath.Join("..", "docs", "swagger.json"),
	}
	for _, p := range candidates {
		data, err := os.ReadFile(p)
		if err == nil {
			c.Set("content-type", "application/json")
			return c.Send(data)
		}
	}
	return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
		"error":  "openapi spec not found",
		"detail": "run `swag init -g internal/bootstrap/app.go -o docs` to generate docs/swagger.json",
	})
}

// newHealthHandler is retained as the constructor used by NewApp so
// the package-level healthProbeRef is bound before any request lands.
func newHealthHandler(probe *health.Probe) fiber.Handler {
	healthProbeRef = probe
	return Health
}

// newReadinessHandler binds the package-level dbRef before the first
// request lands and returns Readiness.
func newReadinessHandler(db *sqlx.DB) fiber.Handler {
	dbRef = db
	return Readiness
}

// newOpenAPIHandler is the constructor for OpenAPISpec. The factory
// exists for symmetry with the other handlers; it currently performs
// no initialization because OpenAPISpec has no external state.
func newOpenAPIHandler() fiber.Handler { return OpenAPISpec }
