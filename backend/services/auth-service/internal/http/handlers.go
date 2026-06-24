package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/tomovu/enchi/services/auth-service/internal/domain"
	"github.com/tomovu/enchi/services/auth-service/internal/service"
)

type Handlers struct {
	svc *service.Service
}

func NewHandlers(svc *service.Service) *Handlers { return &Handlers{svc: svc} }

func (h *Handlers) Health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "auth-service"})
}

type tokenResp struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
}

type userResp struct {
	ID          string `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"displayName"`
}

func (h *Handlers) Register(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email       string `json:"email"`
		Password    string `json:"password"`
		DisplayName string `json:"displayName"`
	}
	if !decode(w, r, &req) {
		return
	}
	if !validEmail(req.Email) {
		writeError(w, http.StatusBadRequest, "INVALID_EMAIL", "email is invalid")
		return
	}
	if len(req.Password) < 8 {
		writeError(w, http.StatusBadRequest, "WEAK_PASSWORD", "password must be at least 8 characters")
		return
	}
	pair, _, err := h.svc.Register(r.Context(), strings.ToLower(strings.TrimSpace(req.Email)), req.Password, strings.TrimSpace(req.DisplayName))
	if err != nil {
		if errors.Is(err, domain.ErrEmailTaken) {
			writeError(w, http.StatusConflict, "EMAIL_TAKEN", "email already registered")
			return
		}
		h.fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, tokenResp{pair.AccessToken, pair.RefreshToken})
}

func (h *Handlers) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !decode(w, r, &req) {
		return
	}
	pair, err := h.svc.Login(r.Context(), strings.ToLower(strings.TrimSpace(req.Email)), req.Password)
	if err != nil {
		if errors.Is(err, domain.ErrInvalidCredentials) {
			writeError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "invalid email or password")
			return
		}
		h.fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, tokenResp{pair.AccessToken, pair.RefreshToken})
}

func (h *Handlers) Refresh(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refreshToken"`
	}
	if !decode(w, r, &req) {
		return
	}
	if req.RefreshToken == "" {
		writeError(w, http.StatusBadRequest, "MISSING_TOKEN", "refreshToken is required")
		return
	}
	pair, err := h.svc.Refresh(r.Context(), req.RefreshToken)
	if err != nil {
		if errors.Is(err, domain.ErrInvalidToken) {
			writeError(w, http.StatusUnauthorized, "INVALID_TOKEN", "invalid or expired refresh token")
			return
		}
		h.fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, tokenResp{pair.AccessToken, pair.RefreshToken})
}

func (h *Handlers) Logout(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refreshToken"`
	}
	if !decode(w, r, &req) {
		return
	}
	if req.RefreshToken != "" {
		if err := h.svc.Logout(r.Context(), req.RefreshToken); err != nil {
			h.fail(w, r, err)
			return
		}
	}
	w.WriteHeader(http.StatusNoContent)
}

// Verify là ForwardAuth target của Traefik: 200 + header X-User-Id, hoặc 401.
func (h *Handlers) Verify(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.authenticate(w, r)
	if !ok {
		return
	}
	w.Header().Set("X-User-Id", userID)
	w.WriteHeader(http.StatusOK)
}

func (h *Handlers) GetMe(w http.ResponseWriter, r *http.Request) {
	u, err := h.svc.Profile(r.Context(), userIDFrom(r.Context()))
	if err != nil {
		h.userErr(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, userResp{u.ID, u.Email, u.DisplayName})
}

func (h *Handlers) UpdateMe(w http.ResponseWriter, r *http.Request) {
	var req struct {
		DisplayName string `json:"displayName"`
	}
	if !decode(w, r, &req) {
		return
	}
	if strings.TrimSpace(req.DisplayName) == "" {
		writeError(w, http.StatusBadRequest, "INVALID_NAME", "displayName is required")
		return
	}
	u, err := h.svc.UpdateDisplayName(r.Context(), userIDFrom(r.Context()), strings.TrimSpace(req.DisplayName))
	if err != nil {
		h.userErr(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, userResp{u.ID, u.Email, u.DisplayName})
}

// requireAuth verify access token trực tiếp (route /users không nằm sau jwt-auth của gateway)
// và đưa user id vào context.
func (h *Handlers) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := h.authenticate(w, r)
		if !ok {
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), userIDKey, userID)))
	})
}

func (h *Handlers) authenticate(w http.ResponseWriter, r *http.Request) (string, bool) {
	token := bearer(r)
	if token == "" {
		writeError(w, http.StatusUnauthorized, "MISSING_TOKEN", "missing bearer token")
		return "", false
	}
	userID, err := h.svc.Verify(r.Context(), token)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "INVALID_TOKEN", "invalid or expired token")
		return "", false
	}
	return userID, true
}

func (h *Handlers) userErr(w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, domain.ErrUserNotFound) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "user not found")
		return
	}
	h.fail(w, r, err)
}

func (h *Handlers) fail(w http.ResponseWriter, r *http.Request, err error) {
	slog.Error("request failed", "err", err, "path", r.URL.Path, "request_id", r.Context().Value(requestIDKey))
	writeError(w, http.StatusInternalServerError, "INTERNAL", "internal server error")
}

// --- helpers ---

func decode(w http.ResponseWriter, r *http.Request, dst any) bool {
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)) // body tối đa 1MB
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid request body")
		return false
	}
	return true
}

func bearer(r *http.Request) string {
	const prefix = "Bearer "
	h := r.Header.Get("Authorization")
	if len(h) > len(prefix) && strings.EqualFold(h[:len(prefix)], prefix) {
		return strings.TrimSpace(h[len(prefix):])
	}
	return ""
}

func userIDFrom(ctx context.Context) string {
	if v, ok := ctx.Value(userIDKey).(string); ok {
		return v
	}
	return ""
}

func validEmail(s string) bool {
	s = strings.TrimSpace(s)
	at := strings.IndexByte(s, '@')
	return at > 0 && at < len(s)-1 && strings.IndexByte(s[at+1:], '.') >= 0
}
