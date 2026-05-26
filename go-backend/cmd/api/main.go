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
	if err := bootstrap.NewApp().Listen(":" + port); err != nil {
		log.Fatal(err)
	}
}
