package httpapi

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/tomovu/enchi/services/media-service/internal/cache"
	"github.com/tomovu/enchi/services/media-service/internal/tts"
)

const maxTextLen = 500

type Handlers struct {
	provider tts.Provider
	cache    *cache.Cache
}

func NewHandlers(p tts.Provider, c *cache.Cache) *Handlers {
	return &Handlers{provider: p, cache: c}
}

func (h *Handlers) Health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "media-service"})
}

// Audio: GET /media/audio?text=...&lang=en -> audio bytes (cache theo hash text+lang).
func (h *Handlers) Audio(w http.ResponseWriter, r *http.Request) {
	text := strings.TrimSpace(r.URL.Query().Get("text"))
	lang := r.URL.Query().Get("lang")
	if lang == "" {
		lang = "en"
	}
	if text == "" {
		writeError(w, http.StatusBadRequest, "INVALID_TEXT", "text is required")
		return
	}
	if len(text) > maxTextLen {
		writeError(w, http.StatusBadRequest, "TEXT_TOO_LONG", "text exceeds 500 chars")
		return
	}

	audio, ct, cached, err := h.synth(text, lang)
	if err != nil {
		writeError(w, http.StatusBadGateway, "TTS_FAILED", "tts synthesis failed")
		return
	}
	w.Header().Set("Content-Type", ct)
	w.Header().Set("Cache-Control", "public, max-age=86400")
	if cached {
		w.Header().Set("X-Cache", "HIT")
	} else {
		w.Header().Set("X-Cache", "MISS")
	}
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(audio)
}

// Batch: POST /media/audio/batch {items:[{text,lang}]} -> warm cache (preload cho 1 bài học).
func (h *Handlers) Batch(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Items []struct {
			Text string `json:"text"`
			Lang string `json:"lang"`
		} `json:"items"`
	}
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid request body")
		return
	}
	warmed := 0
	for _, it := range req.Items {
		text := strings.TrimSpace(it.Text)
		if text == "" || len(text) > maxTextLen {
			continue
		}
		lang := it.Lang
		if lang == "" {
			lang = "en"
		}
		if _, _, cached, err := h.synth(text, lang); err == nil && !cached {
			warmed++
		}
	}
	writeJSON(w, http.StatusOK, map[string]int{"warmed": warmed, "total": len(req.Items)})
}

// synth trả (audio, contentType, cacheHit, err); sinh + lưu cache nếu chưa có.
func (h *Handlers) synth(text, lang string) ([]byte, string, bool, error) {
	key := cacheKey(text, lang)
	if audio, ok := h.cache.Get(key); ok {
		return audio, "audio/wav", true, nil
	}
	audio, ct, err := h.provider.Synthesize(text, lang)
	if err != nil {
		return nil, "", false, err
	}
	h.cache.Set(key, audio)
	return audio, ct, false, nil
}

func cacheKey(text, lang string) string {
	sum := sha256.Sum256([]byte(lang + ":" + text))
	return hex.EncodeToString(sum[:])
}
