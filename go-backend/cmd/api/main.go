package main

import (
	"log"
	"os"

	"github.com/M1ralai/Kastonom/backend/internal/bootstrap"
	"github.com/M1ralai/Kastonom/backend/internal/shared/logging"
)

func main() {
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
