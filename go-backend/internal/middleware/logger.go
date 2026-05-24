package middleware

import (
	"log"

	"github.com/gofiber/fiber/v3"
)

func Logger(c fiber.Ctx) {
	if err := c.Next(); err != nil {
		log.Print("error occured: ", err)
	}
}
