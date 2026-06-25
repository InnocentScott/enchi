// Package tts định nghĩa interface provider-agnostic cho Text-to-Speech.
package tts

import "log/slog"

type Provider interface {
	// Synthesize trả audio bytes + content type cho (text, lang).
	Synthesize(text, lang string) (audio []byte, contentType string, err error)
}

// New chọn implementation theo tên provider. Hiện chỉ "stub" sẵn sàng;
// google/azure sẽ thêm sau (chốt provider) — fallback về stub kèm cảnh báo.
func New(name string, log *slog.Logger) Provider {
	switch name {
	case "stub", "":
		return NewStub()
	default:
		log.Warn("TTS provider not implemented, falling back to stub", "provider", name)
		return NewStub()
	}
}
