package logging

import "go.uber.org/zap"

var global = newGlobalLogger()

func newGlobalLogger() *zap.Logger {
	logger, err := zap.NewProduction()
	if err != nil {
		return zap.NewNop()
	}
	return logger
}

func L() *zap.Logger {
	return global
}

func Sync() error {
	return global.Sync()
}
