package services

import (
	"context"
	// "encoding/json"
	"errors"
	"msg-event/config"
	"msg-event/dao"
	"msg-event/logger"

	// "msg-event/model"
	"msg-event/model/event"
	"msg-event/model/response"
	"msg-event/services/api"
	"msg-event/services/processors"
	"strings"
	"time"

	"go.uber.org/zap"
)

var (
	processorManager map[string]api.Processor
	log              *zap.Logger
)

func initLogger() {
	if log == nil {
		// Initialize logger if not already done
		logger.Init()
		log = logger.Get()
		if log == nil {
			// Fallback to creating a new logger if Get() returns nil
			var err error
			log, err = zap.NewProduction()
			if err != nil {
				panic("failed to create logger: " + err.Error())
			}
		}
	}
}

func InitProcessors() {
	initLogger()

	log.Info("Initializing processors")
	processorManager = map[string]api.Processor{
		"fresh_comment": processors.GetRefreshCommentProcessor(),
		"card":          processors.GetCardProcessor(),
		"trigger_card_v2":  processors.GetCardV2TriggerProcessor(),
		"text":          processors.GetTextProcessor(),
		"image":         processors.GetImageProcessor(),
		"file":          processors.GetAttaProcessor(),
	}
}

func Serve(_ context.Context, e *event.Msg) (event *response.MsgResponse, err error) {

	initLogger()

	reqLog := log.With(
		zap.String("request_id", e.Event.Message.MsgID),
		zap.String("msg_type", e.Event.Message.MsgID),
		zap.String("chat_id", e.Event.Message.ChatID),
	)

	start := time.Now()
	defer func() {
		duration := time.Since(start)
		if err != nil {
			reqLog.Error("Request failed",
				zap.Duration("duration_ms", duration),
				zap.Error(err),
			)
		} else {
			reqLog.Info("Request completed",
				zap.Duration("duration_ms", duration),
			)
		}
	}()

	reqLog.Info("Starting request processing")

	err = dao.SetupConfig()

	if err != nil {
		reqLog.Error("Failed to setup config",
			zap.Error(err),
		)
		return &response.MsgResponse{Challenge: e.Challenge}, err
	}

	processors.InitServices()
	InitProcessors()

	resp := &response.MsgResponse{
		Challenge: e.Challenge,
	}

	if err != nil {
		reqLog.Error("Failed to setup config",
			zap.Error(err),
		)
		return resp, err
	}

	if e.Action != nil && e.Event.Message.MsgType == "" {
		e.Event.Message.MsgType = "card"
		reqLog.Info("Set message type to card for action event")
	}

	// set as card of new version
	if e.Header.EventType == "application.bot.menu_v6" && e.Event.EventKey == "create_case" {
		e.Event.Message.MsgType = "trigger_card_v2"
		reqLog.Info("Set message type to trigger_card_v2 for open case button event")
	}

	if e.Event.Message.MsgType != "" {
		if !Processable(e) {
			reqLog.Info("Skipping duplicate message",
				zap.String("event_id", e.Header.EventID),
			)
			return resp, nil
		}

		processor, ok := processorManager[e.Event.Message.MsgType]
		if !ok {
			err := errors.New("unknown message type")
			reqLog.Error("Unknown message type",
				zap.String("type", e.Event.Message.MsgType),
				zap.Error(err),
			)
			return resp, err
		}

		reqLog.Info("Processing message",
			zap.String("processor", e.Event.Message.MsgType),
		)

		if err := processor.Process(e); err != nil {
			reqLog.Error("Failed to process message",
				zap.Error(err),
			)
			return resp, err
		}
	}

	caze, err := dao.GetCaseByEvent(e)
	if err != nil {
		reqLog.Error("Failed to get case",
			zap.Error(err),
		)
		return resp, err
	}
	if caze == nil {
		reqLog.Info("Return challenge for url_verification")
		return resp, nil
	}

	if caze.Status == dao.STATUS_NEW {
		reqLog.Info("Processing new case",
			zap.String("case_id", caze.CaseID),
		)

		if err := createChatOrNewCase(caze); err != nil {
			reqLog.Error("Failed to create chat or new case",
				zap.Error(err),
				zap.Any("case", caze),
			)
		}

	}
	resp.Elements = caze.CardMsg.Card.Elements
	return resp, nil
}

func createChatOrNewCase(caze *dao.Case) error {
	svcLog := log.With(
		zap.String("case_id", caze.CaseID),
		zap.String("user_id", caze.UserID),
	)

	svcLog.Debug("Validating case details")

	_, sevOk := config.SevMap[caze.SevCode]
	_, serviceOk := config.ServiceMap[caze.ServiceCode]
	_, accountOK := config.Conf.Accounts[caze.AccountKey]

	// Validate case requirements
	if isValidCase(caze, sevOk, serviceOk, accountOK) {
		svcLog.Info("Creating new case and channel")

		caze.Status = dao.STATUS_OPEN
		newCase, err := dao.CreateCaseAndChannel(caze)
		if err != nil {
			svcLog.Error("Failed to create case",
				zap.Error(err),
			)
			return err
		}

		svcLog.Debug("Cleaning up from channel")
		if err := cleanupRootCase(newCase); err != nil {
			svcLog.Error("Failed to cleanup root case",
				zap.Error(err),
			)
			return err
		}

		return nil
	}

	msg := dao.FormatMsg(caze)
	svcLog.Warn("Invalid case parameters",
		zap.String("message", msg),
	)
	return errors.New(msg)
}

func isValidCase(caze *dao.Case, sevOk, serviceOk, accountOK bool) bool {
	return strings.Trim(caze.Title, " ") != "" &&
		strings.Trim(caze.Content, " ") != "" &&
		strings.Trim(caze.SevCode, " ") != "" &&
		sevOk &&
		strings.Trim(caze.ServiceCode, " ") != "" &&
		serviceOk &&
		accountOK &&
		caze.Status == dao.STATUS_NEW
}

func cleanupRootCase(caze *dao.Case) error {
	caze.ChannelID = caze.FromChannelID
	caze.UserID = ""
	caze.Title = ""
	caze.Content = ""
	caze.Type = dao.TYPE_OPEN_CASE
	caze.SevCode = ""
	caze.ServiceCode = ""
	caze.CardMsg.ChatId = caze.ChannelID
	caze.CardMsg.UserId = caze.UserID

	_, err := dao.UpsertCase(caze)
	return err
}
