package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/tomovu/enchi/services/auth-service/internal/domain"
)

type RefreshTokenStore interface {
	Save(ctx context.Context, id, userID, tokenHash string, expiresAt time.Time) error
	FindActiveUserID(ctx context.Context, tokenHash string) (string, error)
	Revoke(ctx context.Context, tokenHash string) error
}

type PgRefreshTokenStore struct {
	pool *pgxpool.Pool
}

func NewPgRefreshTokenStore(pool *pgxpool.Pool) *PgRefreshTokenStore {
	return &PgRefreshTokenStore{pool: pool}
}

func (s *PgRefreshTokenStore) Save(ctx context.Context, id, userID, tokenHash string, expiresAt time.Time) error {
	const q = `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked)
	           VALUES ($1, $2, $3, $4, false)`
	_, err := s.pool.Exec(ctx, q, id, userID, tokenHash, expiresAt)
	return err
}

func (s *PgRefreshTokenStore) FindActiveUserID(ctx context.Context, tokenHash string) (string, error) {
	const q = `SELECT user_id FROM refresh_tokens
	           WHERE token_hash = $1 AND revoked = false AND expires_at > now()`
	var userID string
	err := s.pool.QueryRow(ctx, q, tokenHash).Scan(&userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", domain.ErrInvalidToken
	}
	return userID, err
}

func (s *PgRefreshTokenStore) Revoke(ctx context.Context, tokenHash string) error {
	const q = `UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1`
	_, err := s.pool.Exec(ctx, q, tokenHash)
	return err
}
