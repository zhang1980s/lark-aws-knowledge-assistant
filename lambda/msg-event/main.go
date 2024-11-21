package main

import (
	"context"
	"encoding/json"
	"msg-event/logger"
	"msg-event/services"
	"runtime/debug"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"go.uber.org/zap"

	"msg-event/model/event"
	"msg-event/model/response"
)

// Logger package (pkg/logger/logger.go)
type CoreField struct {
	RequestID string
}

// contextKey is a custom type for context keys to avoid collisions
type contextKey string

// Define context keys
const loggerContextKey = contextKey("logger")

// Lambda handler with logging middleware
type lambdaHandler struct {
	handler func(context.Context, *event.Msg) (*response.MsgResponse, error)
	logger  *zap.Logger
}

func (h *lambdaHandler) Invoke(ctx context.Context, payload []byte) ([]byte, error) {
	var e event.Msg
	if err := json.Unmarshal(payload, &e); err != nil {
		h.logger.Error("Failed to unmarshal payload",
			zap.Error(err),
			zap.Binary("payload", payload),
		)
		return nil, err
	}

	// Log event details in human readable format
	h.logger.Debug("Received Lambda event",
		zap.Any("event_header", map[string]interface{}{
			"event_id":    e.Header.EventID,
			"event_type":  e.Header.EventType,
			"create_time": e.Header.CreateTime,
			"token":       e.Header.Token,
			"app_id":      e.Header.AppID,
			"tenant_key":  e.Header.TenantKey,
			"event_key":   e.Event.EventKey,
		}),
		zap.Any("sender", map[string]interface{}{
			"sender_id":   e.Event.Sender.SenderIDs,
			"sender_type": e.Event.Sender.SenderType,
			"tenant_key":  e.Event.Sender.TenantKey,
		}),
		zap.Any("message", map[string]interface{}{
			"message_id":   e.Event.Message.MsgID,
			"root_id":      e.Event.Message.RootID,
			"parent_id":    e.Event.Message.ParentID,
			"create_time":  e.Event.Message.CreateTime,
			"chat_id":      e.Event.Message.ChatID,
			"chat_type":    e.Event.Message.ChatType,
			"message_type": e.Event.Message.MsgType,
			"content":      e.Event.Message.Content,
		}),
	)

	// Use message ID as request ID
	requestID := e.Event.Message.MsgID

	// Initialize request-scoped logger
	reqLogger := h.logger.With(
		zap.String("request_id", requestID),
	)

	// Add logger to context using custom key type
	ctx = context.WithValue(ctx, loggerContextKey, reqLogger)

	// Start timer for request duration
	start := time.Now()

	// Log request
	reqLogger.Info("Processing lambda request",
		zap.String("event_schema", e.Schema),
		zap.String("chat_id", e.Event.Message.ChatID),
	)

	// Process request
	response, err := h.handler(ctx, &e)

	// Log completion with duration
	duration := time.Since(start)
	if err != nil {
		reqLogger.Error("Lambda request failed",
			zap.Duration("duration_ms", duration),
			zap.Error(err),
		)
		return nil, err
	}

	reqLogger.Info("Lambda request completed",
		zap.Duration("duration_ms", duration),
	)

	// Marshal response to JSON
	responseBytes, err := json.Marshal(response)
	if err != nil {
		reqLogger.Error("Failed to marshal response",
			zap.Error(err),
		)
		return nil, err
	}

	return responseBytes, nil
}

func HandleRequest(ctx context.Context, e *event.Msg) (*response.MsgResponse, error) {
	// Get logger from context using custom key type
	log := ctx.Value(loggerContextKey).(*zap.Logger)

	// Recover from panics
	defer func() {
		if r := recover(); r != nil {
			log.Error("Panic recovered",
				zap.Any("error", r),
				zap.String("stack", string(debug.Stack())),
			)
		}
	}()

	log.Info("Processing request",
		zap.Any("event", e),
	)

	resp, err := services.Serve(ctx, e)
	if err != nil {
		log.Error("Request failed",
			zap.Error(err),
		)
		return resp, err
	}

	return resp, nil
}

func main() {
	// Initialize logger
	logger.Init()
	zapLogger := logger.Get()
	defer zapLogger.Sync()

	// Create handler with logger
	handler := &lambdaHandler{
		handler: HandleRequest,
		logger:  zapLogger,
	}

	// Start lambda
	lambda.Start(handler)
}
