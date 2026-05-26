package main

import (
	"log"
	"os"

	"github.com/M1ralai/Kastonom/backend/internal/bootstrap"
	"github.com/M1ralai/Kastonom/backend/internal/shared/logging"
	"github.com/joho/godotenv"
)

// @title Kastonom Backend API
// @version 1.0
// @description Kastonom Go backend API documentation.
// @BasePath /
// @schemes http https
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @securityDefinitions.apikey TenantID
// @in header
// @name x-tenant-id
func main() {
	_ = godotenv.Load("go-backend/.env.local", "go-backend/.env", ".env.local", ".env")

	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}
	app, err := bootstrap.NewApp()
	if err != nil {
		log.Fatal(err)
	}
	defer func() {
		_ = logging.Sync()
	}()
	if err := app.Listen(":" + port); err != nil {
		log.Fatal(err)
	}
}
