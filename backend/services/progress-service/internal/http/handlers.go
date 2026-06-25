package httpapi

import (
	"net/http"
	"strconv"

	"github.com/tomovu/enchi/services/progress-service/internal/service"
)

type Handlers struct {
	svc *service.Service
}

func NewHandlers(svc *service.Service) *Handlers { return &Handlers{svc: svc} }

func (h *Handlers) Health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "progress-service"})
}

// GetMe đọc X-User-Id do gateway forward (route /progress nằm sau jwt-auth).
func (h *Handlers) GetMe(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-Id")
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing X-User-Id")
		return
	}
	view, err := h.svc.GetProgress(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", "internal server error")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *Handlers) GetByUser(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("userId")
	view, err := h.svc.GetProgress(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", "internal server error")
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (h *Handlers) Leaderboard(w http.ResponseWriter, r *http.Request) {
	limit := 50
	if q := r.URL.Query().Get("limit"); q != "" {
		if n, err := strconv.Atoi(q); err == nil && n > 0 {
			limit = n
		}
	}
	if limit > 100 {
		limit = 100
	}
	entries, err := h.svc.Leaderboard(r.Context(), limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", "internal server error")
		return
	}
	writeJSON(w, http.StatusOK, entries)
}
