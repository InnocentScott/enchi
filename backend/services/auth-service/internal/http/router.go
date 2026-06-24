package httpapi

import (
	"log/slog"
	"net/http"
)

func NewRouter(h *Handlers, log *slog.Logger) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", h.Health)

	// Public — gateway KHÔNG gắn jwt-auth cho router auth.
	mux.HandleFunc("POST /auth/register", h.Register)
	mux.HandleFunc("POST /auth/login", h.Login)
	mux.HandleFunc("POST /auth/refresh", h.Refresh)
	mux.HandleFunc("POST /auth/logout", h.Logout)
	mux.HandleFunc("GET /auth/verify", h.Verify) // ForwardAuth target

	// Protected — tự verify access token (requireAuth).
	mux.Handle("GET /users/me", h.requireAuth(http.HandlerFunc(h.GetMe)))
	mux.Handle("PATCH /users/me", h.requireAuth(http.HandlerFunc(h.UpdateMe)))

	return chain(mux, recoverer(log), requestID, logging(log))
}
