package httpapi

import (
	"log/slog"
	"net/http"
)

func NewRouter(h *Handlers, log *slog.Logger) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", h.Health)
	mux.HandleFunc("GET /media/audio", h.Audio)
	mux.HandleFunc("POST /media/audio/batch", h.Batch)
	return chain(mux, recoverer(log), requestID, logging(log))
}
