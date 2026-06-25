package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/tomovu/enchi/services/progress-service/internal/domain"
)

type ProgressStore struct {
	pool *pgxpool.Pool
}

func NewProgressStore(pool *pgxpool.Pool) *ProgressStore { return &ProgressStore{pool: pool} }

func (s *ProgressStore) Get(ctx context.Context, userID string) (domain.Progress, error) {
	const q = `SELECT user_id, display_name, total_xp, current_streak, longest_streak, last_active_date
	           FROM user_progress WHERE user_id = $1`
	var p domain.Progress
	var last *time.Time
	err := s.pool.QueryRow(ctx, q, userID).
		Scan(&p.UserID, &p.DisplayName, &p.TotalXP, &p.CurrentStreak, &p.LongestStreak, &last)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Progress{}, domain.ErrNotFound
	}
	if err != nil {
		return domain.Progress{}, err
	}
	p.LastActiveDate = last
	return p, nil
}

func (s *ProgressStore) GetMany(ctx context.Context, ids []string) (map[string]domain.Progress, error) {
	out := make(map[string]domain.Progress, len(ids))
	if len(ids) == 0 {
		return out, nil
	}
	const q = `SELECT user_id, display_name, total_xp, current_streak, longest_streak, last_active_date
	           FROM user_progress WHERE user_id = ANY($1)`
	rows, err := s.pool.Query(ctx, q, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var p domain.Progress
		var last *time.Time
		if err := rows.Scan(&p.UserID, &p.DisplayName, &p.TotalXP, &p.CurrentStreak, &p.LongestStreak, &last); err != nil {
			return nil, err
		}
		p.LastActiveDate = last
		out[p.UserID] = p
	}
	return out, rows.Err()
}

// markProcessed cố insert eventId; trả true nếu lần đầu xử lý, false nếu trùng (idempotency).
func markProcessed(ctx context.Context, tx pgx.Tx, eventID string) (bool, error) {
	ct, err := tx.Exec(ctx, `INSERT INTO processed_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING`, eventID)
	if err != nil {
		return false, err
	}
	return ct.RowsAffected() == 1, nil
}

// ApplyUserRegistered tạo progress mặc định (nếu chưa có). Trả (processed, totalXP).
func (s *ProgressStore) ApplyUserRegistered(ctx context.Context, eventID, userID, displayName string) (bool, int, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return false, 0, err
	}
	defer tx.Rollback(ctx)

	fresh, err := markProcessed(ctx, tx, eventID)
	if err != nil {
		return false, 0, err
	}
	if !fresh {
		return false, 0, tx.Commit(ctx)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO user_progress (user_id, display_name) VALUES ($1, $2)
		ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = now()
	`, userID, displayName); err != nil {
		return false, 0, err
	}

	var totalXP int
	if err := tx.QueryRow(ctx, `SELECT total_xp FROM user_progress WHERE user_id = $1`, userID).Scan(&totalXP); err != nil {
		return false, 0, err
	}
	return true, totalXP, tx.Commit(ctx)
}

// ApplyQuizCompleted cộng XP + cập nhật streak trong 1 transaction. Trả (processed, newTotalXP).
func (s *ProgressStore) ApplyQuizCompleted(ctx context.Context, eventID, userID string, xpGain int, now time.Time) (bool, int, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return false, 0, err
	}
	defer tx.Rollback(ctx)

	fresh, err := markProcessed(ctx, tx, eventID)
	if err != nil {
		return false, 0, err
	}
	if !fresh {
		var totalXP int
		_ = tx.QueryRow(ctx, `SELECT COALESCE(total_xp, 0) FROM user_progress WHERE user_id = $1`, userID).Scan(&totalXP)
		return false, totalXP, tx.Commit(ctx)
	}

	var curStreak, curLongest, curTotal int
	var last *time.Time
	err = tx.QueryRow(ctx, `SELECT total_xp, current_streak, longest_streak, last_active_date
	                        FROM user_progress WHERE user_id = $1 FOR UPDATE`, userID).
		Scan(&curTotal, &curStreak, &curLongest, &last)
	if errors.Is(err, pgx.ErrNoRows) {
		curTotal, curStreak, curLongest, last = 0, 0, 0, nil
	} else if err != nil {
		return false, 0, err
	}

	newStreak, lastActive := domain.NextStreak(last, now, curStreak)
	newLongest := curLongest
	if newStreak > newLongest {
		newLongest = newStreak
	}
	newTotal := curTotal + xpGain

	if _, err := tx.Exec(ctx, `
		INSERT INTO user_progress (user_id, total_xp, current_streak, longest_streak, last_active_date, updated_at)
		VALUES ($1, $2, $3, $4, $5, now())
		ON CONFLICT (user_id) DO UPDATE SET
		  total_xp = $2, current_streak = $3, longest_streak = $4, last_active_date = $5, updated_at = now()
	`, userID, newTotal, newStreak, newLongest, lastActive); err != nil {
		return false, 0, err
	}

	return true, newTotal, tx.Commit(ctx)
}
