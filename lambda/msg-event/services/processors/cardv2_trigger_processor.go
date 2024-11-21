package processors

import (
	"errors"
	"msg-event/config"
	"msg-event/dao"
	"msg-event/model/event"
	"msg-event/services/api"
	"os"

	"github.com/sirupsen/logrus"
)

type cardV2TriggerProcessor struct {
}

func GetCardV2TriggerProcessor() api.Processor {
	return &cardV2TriggerProcessor{}
}

func (r cardV2TriggerProcessor) ShouldProcess(e *event.Msg) bool {
	//perimission judgetment
	userId := e.UserID
	_, ok := config.Conf.UserWhiteListMap[userId]

	if os.Getenv("ENABLE_USER_WHITELIST") == "true" && !ok {
		fromChannelID := e.Event.Message.ChatID
		dao.SendMsgToChannel(fromChannelID, config.Conf.NoPermissionMSG)
		return false
	}
	return true
}

func (r cardV2TriggerProcessor) Process(e *event.Msg) (err error) {

	// handle the open case button
	e.Action = &event.Action{
		Value : &event.Value{
			Key : e.Event.Message.MsgType
		}
	}

	if e.Action != nil {
		if ok := r.ShouldProcess(e); !ok {
			return nil
		}
		if v, ok := serverManager[e.Action.Value.Key]; ok {
			logrus.Infof("commond %s. value %s", e.Action.Value, e.Action.Option)
			_, err = v.Handle(e, e.Action.Option)
			if err != nil {
				logrus.Errorf("faile to handle card msg %v", err)
				return err
			}
			return nil
		} else {
			logrus.Errorf("card select failed %v", e.Action)
			return errors.New("failed to match action handler")
		}
	}
	return nil
}
