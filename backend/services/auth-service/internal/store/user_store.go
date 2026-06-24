package store

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/tomovu/enchi/services/auth-service/internal/domain"
)

// UserStore là interface (mock được khi test); PgUserStore là impl pgx.
type UserStore interface {
	Create(ctx context.Context, u domain.User) error
	GetByEmail(ctx context.Context, email string) (domain.User, error)
	GetByID(ctx context.Context, id string) (domain.User, error)
	UpdateDisplayName(ctx context.Context, id, displayName string) error
}

type PgUserStore struct {
	pool *pgxpool.Pool
}

func NewPgUserStore(pool *pgxpool.Pool) *PgUserStore { return &PgUserStore{pool: pool} }

func (s *PgUserStore) Create(ctx context.Context, u domain.User) error {
	const q = `INSERT INTO users (id, email, password_hash, display_name, created_at)
	           VALUES ($1, $2, $3, $4, $5)`
	_, err := s.pool.Exec(ctx, q, u.ID, u.Email, u.PasswordHash, u.DisplayName, u.CreatedAt)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" { // unique_violation
		return domain.ErrEmailTaken
	}
	return err
}

func (s *PgUserStore) GetByEmail(ctx context.Context, email string) (domain.User, error) {
	const q = `SELECT id, email, password_hash, display_name, created_at FROM users WHERE email = $1`
	return scanUser(s.pool.QueryRow(ctx, q, email))
}

func (s *PgUserStore) GetByID(ctx context.Context, id string) (domain.User, error) {
	const q = `SELECT id, email, password_hash, display_name, created_at FROM users WHERE id = $1`
	return scanUser(s.pool.QueryRow(ctx, q, id))
}

func (s *PgUserStore) UpdateDisplayName(ctx context.Context, id, displayName string) error {
	const q = `UPDATE users SET display_name = $2 WHERE id = $1`
	ct, err := s.pool.Exec(ctx, q, id, displayName)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return domain.ErrUserNotFound
	}
	return nil
}

type scannable interface {
	Scan(dest ...any) error
}

func scanUser(r scannable) (domain.User, error) {
	var u domain.User
	err := r.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.DisplayName, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.User{}, domain.ErrUserNotFound
	}
	return u, err
}
