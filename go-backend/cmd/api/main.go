package main

import (
	"log"
	"os"

	"github.com/M1ralai/Kastonom/backend/internal/bootstrap"
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
	if err := app.Listen(":" + port); err != nil {
		log.Fatal(err)
	}
}
