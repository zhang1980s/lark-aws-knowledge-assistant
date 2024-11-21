package handlers

import (
	// "msg-event/config"
	"msg-event/dao"
	"msg-event/model/event"
	"msg-event/services/api"

	// "strings"
	// "time"

	"github.com/sirupsen/logrus"
)

type cardv2ConfirmServ struct {
}

func GetCardv2ConfirmServ() api.Server {
	return &cardv2ConfirmServ{}
}

func (s *cardv2ConfirmServ) Handle(e *event.Msg, str string) (c *dao.Case, err error) {
	c, err = dao.GetCaseByEvent(e)
	if err != nil {
		logrus.Errorf("failed to get case %s", err)
		return nil, err
	}
	c.Status = dao.STATUS_NEW
	return dao.UpsertCase(c)
}

func (s *cardv2ConfirmServ) ShouldHandle(e *event.Msg) bool {
	return true
}
