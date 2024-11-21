package model

type Config struct {
	WideScreenMode bool `json:"wide_screen_mode"`
}
type Text struct {
	Tag     string `json:"tag"`
	Content string `json:"content"`
}

type TextElement struct {
	Tag  string `json:"tag"`
	Text Text   `json:"text,omitempty"`
}

type Placeholder struct {
	Tag     string `json:"tag"`
	Content string `json:"content"`
}
type Value struct {
	Key string `json:"key"`
}
type Options struct {
	Text  Text   `json:"text"`
	Value string `json:"value"`
}
type Extra struct {
	Tag           string      `json:"tag"`
	Placeholder   Placeholder `json:"placeholder"`
	Value         Value       `json:"value"`
	InitialOption string      `json:"initial_option,omitempty"`
	Options       []Options   `json:"options"`
}

type URLVal struct {
	URL        string `json:"url"`
	AndroidURL string `json:"android_url"`
	IosURL     string `json:"ios_url"`
	PcURL      string `json:"pc_url"`
}
type Href struct {
	URLVal URLVal `json:"urlVal"`
}
type Elements struct {
	Tag     string `json:"tag"`
	Text    Text   `json:"text,omitempty"`
	Extra   Extra  `json:"extra,omitempty"`
	Content string `json:"content,omitempty"`
	Href    Href   `json:"href,omitempty"`
}
type Card struct {
	Config   Config     `json:"config"`
	Elements []Elements `json:"elements"`
}

// Card v2 struct
type Cardv2 struct {
	Config       Config       `json:"config"`
	CardLink     CardLink     `json:"card_link"`
	I18nElements I18nElements `json:"i18n_elements"`
	Header       Header       `json:"header"`
}

type I18nElements struct {
	ZhCN []ElementV2 `json:"zh_cn"`
	EnUS []ElementV2 `json:"en_us"`
}

type Header struct {
	Template string `json:"template"`
	Title    Title  `json:"title"`
}

type Title struct {
	Tag  string `json:"tag"`
	I18n I18n   `json:"i18n"`
}

type I18n struct {
	ZhCN string `json:"zh_cn"`
	EnUS string `json:"en_us,omitempty"`
}

type CardLink struct {
	URL        string `json:"url"`
	PCURL      string `json:"pc_url"`
	AndroidURL string `json:"android_url"`
	IOSURL     string `json:"ios_url"`
}

type ElementV2 struct {
	Tag     string   `json:"tag"`
	Text    *Text    `json:"text,omitempty"`
	Extra   *Extra   `json:"extra,omitempty"`
	Actions []Action `json:"actions,omitempty"`
	Content string   `json:"content,omitempty"`
}

type Option struct {
	Text  Text   `json:"text"`
	Value string `json:"value"`
}

type Action struct {
	Tag           string `json:"tag"`
	InputType     string `json:"input_type,omitempty"`
	Rows          int    `json:"rows,omitempty"`
	AutoResize    bool   `json:"auto_resize,omitempty"`
	Name          string `json:"name,omitempty"`
	Placeholder   *Text  `json:"placeholder,omitempty"`
	DefaultValue  string `json:"default_value,omitempty"`
	Width         string `json:"width,omitempty"`
	Label         *Text  `json:"label,omitempty"`
	LabelPosition string `json:"label_position,omitempty"`
	Fallback      *struct {
		Tag  string `json:"tag"`
		Text *Text  `json:"text"`
	} `json:"fallback,omitempty"`
	Text *Text  `json:"text,omitempty"`
	URL  string `json:"url,omitempty"`
	Type string `json:"type,omitempty"`
}
