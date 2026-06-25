package httpapi

import (
	"log/slog"
	"net/http"
)

func NewRouter(h *Handlers, log *slog.Logger) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", h.Health)
	mux.HandleFunc("GET /progress/me", h.GetMe)        // literal segment ưu tiên hơn wildcard
	mux.HandleFunc("GET /progress/{userId}", h.GetByUser)
	mux.HandleFunc("GET /leaderboard", h.Leaderboard)
	return chain(mux, recoverer(log), requestID, logging(log))
}
