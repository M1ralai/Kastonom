package logging

import (
	"errors"
	"time"

	"github.com/gofiber/fiber/v3"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

type Leveler interface {
	LogLevel() zapcore.Level
}

func ErrorMiddleware() fiber.Handler {
	return func(c fiber.Ctx) error {
		startedAt := time.Now()
		err := c.Next()
		if err == nil {
			return nil
		}

		fields := []zap.Field{
			zap.Error(err),
			zap.String("method", c.Method()),
			zap.String("path", c.Path()),
			zap.Int("status", statusCode(c, err)),
			zap.String("request_id", c.Get("x-request-id")),
			zap.String("tenant_id", c.Get("x-tenant-id")),
			zap.String("ip", c.IP()),
			zap.Duration("duration", time.Since(startedAt)),
		}

		switch levelForError(err) {
		case zapcore.DebugLevel:
			L().Debug("fiber handler returned error", fields...)
		case zapcore.InfoLevel:
			L().Info("fiber handler returned error", fields...)
		case zapcore.WarnLevel:
			L().Warn("fiber handler returned error", fields...)
		default:
			L().Error("fiber handler returned error", fields...)
		}

		return err
	}
}

func levelForError(err error) zapcore.Level {
	var leveler Leveler
	if errors.As(err, &leveler) {
		return leveler.LogLevel()
	}

	var fiberErr *fiber.Error
	if errors.As(err, &fiberErr) && fiberErr.Code < fiber.StatusInternalServerError {
		return zapcore.WarnLevel
	}

	return zapcore.ErrorLevel
}

func statusCode(c fiber.Ctx, err error) int {
	var fiberErr *fiber.Error
	if errors.As(err, &fiberErr) {
		return fiberErr.Code
	}

	status := c.Response().StatusCode()
	if status >= fiber.StatusBadRequest {
		return status
	}
	return fiber.StatusInternalServerError
}
