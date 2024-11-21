package handlers

import (
	"msg-event/config"
	"msg-event/dao"
	"msg-event/model/event"
	"msg-event/services/api"

	"github.com/sirupsen/logrus"
)

const openCaseTitleKey = "title"

type openTriggerCardV2Serv struct {
}

func GetTriggerCardV2Serv() api.Server {
	return &openTriggerCardV2Serv{}
}

func (s *openTriggerCardV2Serv) Handle(e *event.Msg, title string) (c *dao.Case, err error) {
	
	customerID := e.Event.Sender.SenderIDs.UserID
	fromChannelID := customerID
	config.Conf.CaseCardTemplateV2.ChatId = fromChannelID
	config.Conf.CaseCardTemplateV2.UserId = customerID

	title = "MisTitle"

	c = &dao.Case{
		Title: title,
	}

	for i, element := range config.Conf.CaseCardTemplateV2.Card.Elements {
		if element.Extra.Value.Key == openCaseTitleKey {
			config.Conf.CaseCardTemplateV2.Card.Elements[i].Content += title
			logrus.Infof("match key %v. value %v", openCaseTitleKey, title)
			break
		} else {
			logrus.Infof("not match key %v. value %v", openCaseTitleKey, title)
		}
	}

	rsp, err := dao.SendCardMsg(config.Conf.CaseCardTemplateV2, c)
	if err != nil {
		logrus.Errorf("Failed to send card msg, %v", err)
		return nil, err
	}
	return dao.OpenCaseWithStatus(fromChannelID, customerID, title, *rsp.Data.MessageId, config.Conf.CaseCardTemplateV2, dao.STATUS_PRE_NEW)

}

func (s *openTriggerCardV2Serv) ShouldHandle(e *event.Msg) bool {
	return true
}
