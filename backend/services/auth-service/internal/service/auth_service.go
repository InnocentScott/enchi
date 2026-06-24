// Package service orchestrate nghiệp vụ auth (đứng giữa http và store/crypto/events).
package service

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/tomovu/enchi/services/auth-service/internal/auth"
	"github.com/tomovu/enchi/services/auth-service/internal/domain"
	"github.com/tomovu/enchi/services/auth-service/internal/store"
)

// EventPublisher tách giao tiếp RabbitMQ thành interface để service test được.
type EventPublisher interface {
	PublishUserRegistered(ctx context.Context, eventID string, u domain.User) error
}

type TokenPair struct {
	AccessToken  string
	RefreshToken string
}

type Service struct {
	users  store.UserStore
	tokens store.RefreshTokenStore
	tm     *auth.TokenManager
	pub    EventPublisher
	log    *slog.Logger
}

func New(users store.UserStore, tokens store.RefreshTokenStore, tm *auth.TokenManager, pub EventPublisher, log *slog.Logger) *Service {
	return &Service{users: users, tokens: tokens, tm: tm, pub: pub, log: log}
}

func (s *Service) Register(ctx context.Context, email, password, displayName string) (TokenPair, domain.User, error) {
	hash, err := auth.HashPassword(password)
	if err != nil {
		return TokenPair{}, domain.User{}, err
	}
	u := domain.User{
		ID:           uuid.NewString(),
		Email:        email,
		PasswordHash: hash,
		DisplayName:  displayName,
		CreatedAt:    time.Now().UTC(),
	}
	if err := s.users.Create(ctx, u); err != nil {
		return TokenPair{}, domain.User{}, err // ErrEmailTaken bubble lên handler
	}
	pair, err := s.issue(ctx, u.ID)
	if err != nil {
		return TokenPair{}, domain.User{}, err
	}
	// Publish SAU khi user được tạo bền vững. Best-effort: publish lỗi không làm hỏng
	// đăng ký; hệ thống production nên dùng transactional outbox để đảm bảo at-least-once.
	if err := s.pub.PublishUserRegistered(ctx, uuid.NewString(), u); err != nil {
		s.log.Error("publish user_registered failed", "err", err, "user_id", u.ID)
	}
	return pair, u, nil
}

func (s *Service) Login(ctx context.Context, email, password string) (TokenPair, error) {
	u, err := s.users.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, domain.ErrUserNotFound) {
			return TokenPair{}, domain.ErrInvalidCredentials // không lộ user tồn tại hay không
		}
		return TokenPair{}, err
	}
	if !auth.CheckPassword(u.PasswordHash, password) {
		return TokenPair{}, domain.ErrInvalidCredentials
	}
	return s.issue(ctx, u.ID)
}

func (s *Service) Refresh(ctx context.Context, refreshToken string) (TokenPair, error) {
	userID, err := s.tm.ParseRefresh(refreshToken)
	if err != nil {
		return TokenPair{}, domain.ErrInvalidToken
	}
	hash := auth.HashToken(refreshToken)
	storedUserID, err := s.tokens.FindActiveUserID(ctx, hash)
	if err != nil {
		return TokenPair{}, err // ErrInvalidToken nếu không tồn tại/đã revoke/hết hạn
	}
	if storedUserID != userID {
		return TokenPair{}, domain.ErrInvalidToken
	}
	// Rotation: revoke token vừa dùng rồi cấp cặp mới.
	if err := s.tokens.Revoke(ctx, hash); err != nil {
		return TokenPair{}, err
	}
	return s.issue(ctx, userID)
}

func (s *Service) Logout(ctx context.Context, refreshToken string) error {
	return s.tokens.Revoke(ctx, auth.HashToken(refreshToken))
}

// Verify dùng cho /auth/verify (ForwardAuth) và requireAuth middleware.
func (s *Service) Verify(_ context.Context, accessToken string) (string, error) {
	userID, err := s.tm.ParseAccess(accessToken)
	if err != nil {
		return "", domain.ErrInvalidToken
	}
	return userID, nil
}

func (s *Service) Profile(ctx context.Context, userID string) (domain.User, error) {
	return s.users.GetByID(ctx, userID)
}

func (s *Service) UpdateDisplayName(ctx context.Context, userID, displayName string) (domain.User, error) {
	if err := s.users.UpdateDisplayName(ctx, userID, displayName); err != nil {
		return domain.User{}, err
	}
	return s.users.GetByID(ctx, userID)
}

func (s *Service) issue(ctx context.Context, userID string) (TokenPair, error) {
	access, err := s.tm.GenerateAccess(userID)
	if err != nil {
		return TokenPair{}, err
	}
	refresh, err := s.tm.GenerateRefresh(userID)
	if err != nil {
		return TokenPair{}, err
	}
	expiresAt := time.Now().Add(s.tm.RefreshTTL())
	if err := s.tokens.Save(ctx, uuid.NewString(), userID, auth.HashToken(refresh), expiresAt); err != nil {
		return TokenPair{}, err
	}
	return TokenPair{AccessToken: access, RefreshToken: refresh}, nil
}
