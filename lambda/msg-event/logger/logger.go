package logger

import (
	"os"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var log *zap.Logger

// Standard fields for all logs
type CoreField struct {
	RequestID string
}

func Init() {
	// Configure logging level based on environment
	level := zap.InfoLevel
	if os.Getenv("LOG_LEVEL") == "DEBUG" {
		level = zap.DebugLevel
	}

	// Production encoder config
	encoderCfg := zap.NewProductionEncoderConfig()
	encoderCfg.TimeKey = "timestamp"
	encoderCfg.LevelKey = "level"
	encoderCfg.NameKey = "logger"
	encoderCfg.CallerKey = "caller"
	encoderCfg.MessageKey = "message"
	encoderCfg.StacktraceKey = "stacktrace"
	encoderCfg.EncodeLevel = zapcore.CapitalLevelEncoder
	encoderCfg.EncodeTime = zapcore.TimeEncoderOfLayout(time.RFC3339Nano)
	encoderCfg.EncodeDuration = zapcore.MillisDurationEncoder
	encoderCfg.EncodeCaller = zapcore.ShortCallerEncoder

	// Create logger config
	cfg := zap.Config{
		Level:            zap.NewAtomicLevelAt(level),
		Development:      false,
		Encoding:         "json",
		EncoderConfig:    encoderCfg,
		OutputPaths:      []string{"stdout"},
		ErrorOutputPaths: []string{"stdout"},
	}

	var err error
	log, err = cfg.Build(
		zap.AddCaller(),
		zap.AddStacktrace(zap.ErrorLevel),
		zap.AddCallerSkip(1),
	)
	if err != nil {
		panic(err)
	}
}

// Get returns the global logger
func Get() *zap.Logger {
	return log
}

// WithRequestContext adds request context to logger
func WithRequestContext(fields CoreField) *zap.Logger {
	return log.With(
		zap.String("request_id", fields.RequestID),
	)
}
