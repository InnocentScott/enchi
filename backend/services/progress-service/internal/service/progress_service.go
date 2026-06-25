package service

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/tomovu/enchi/services/progress-service/internal/domain"
	"github.com/tomovu/enchi/services/progress-service/internal/store"
)

type Service struct {
	store *store.ProgressStore
	redis *store.RedisStore
	log   *slog.Logger
}

func New(ps *store.ProgressStore, rs *store.RedisStore, log *slog.Logger) *Service {
	return &Service{store: ps, redis: rs, log: log}
}

type ProgressView struct {
	UserID        string `json:"userId"`
	DisplayName   string `json:"displayName"`
	TotalXP       int    `json:"totalXp"`
	CurrentStreak int    `json:"currentStreak"`
	LongestStreak int    `json:"longestStreak"`
	Rank          int    `json:"rank"` // 1-based; 0 = chưa xếp hạng
}

type LeaderboardEntryView struct {
	Rank        int    `json:"rank"`
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
	TotalXP     int    `json:"totalXp"`
}

// --- event handlers (gọi từ RabbitMQ consumer) ---

func (s *Service) HandleUserRegistered(ctx context.Context, eventID, userID, displayName string) error {
	processed, totalXP, err := s.store.ApplyUserRegistered(ctx, eventID, userID, displayName)
	if err != nil {
		return err
	}
	if !processed {
		return nil // duplicate
	}
	if err := s.redis.SetScore(ctx, userID, totalXP); err != nil {
		s.log.Error("leaderboard set on register", "err", err, "user_id", userID)
	}
	return nil
}

func (s *Service) HandleQuizCompleted(ctx context.Context, eventID, userID string, score int) error {
	processed, newTotal, err := s.store.ApplyQuizCompleted(ctx, eventID, userID, domain.XPForQuiz(score), time.Now().UTC())
	if err != nil {
		return err
	}
	if !processed {
		return nil
	}
	if err := s.redis.SetScore(ctx, userID, newTotal); err != nil {
		s.log.Error("leaderboard set on quiz", "err", err, "user_id", userID)
	}
	s.log.Info("xp updated", "user_id", userID, "gained_for_score", score, "total_xp", newTotal)
	return nil
}

// --- queries (HTTP) ---

func (s *Service) GetProgress(ctx context.Context, userID string) (ProgressView, error) {
	p, err := s.store.Get(ctx, userID)
	if errors.Is(err, domain.ErrNotFound) {
		p = domain.Progress{UserID: userID}
	} else if err != nil {
		return ProgressView{}, err
	}
	rank, err := s.redis.Rank(ctx, userID)
	if err != nil {
		rank = -1
	}
	return toView(p, rank), nil
}

func (s *Service) Leaderboard(ctx context.Context, limit int) ([]LeaderboardEntryView, error) {
	entries, err := s.redis.Top(ctx, limit)
	if err != nil {
		return nil, err
	}
	ids := make([]string, len(entries))
	for i, e := range entries {
		ids[i] = e.UserID
	}
	names, err := s.store.GetMany(ctx, ids)
	if err != nil {
		return nil, err
	}
	out := make([]LeaderboardEntryView, 0, len(entries))
	for i, e := range entries {
		out = append(out, LeaderboardEntryView{
			Rank:        i + 1,
			UserID:      e.UserID,
			DisplayName: names[e.UserID].DisplayName,
			TotalXP:     e.XP,
		})
	}
	return out, nil
}

func toView(p domain.Progress, rank int64) ProgressView {
	r := 0
	if rank >= 0 {
		r = int(rank) + 1
	}
	return ProgressView{
		UserID:        p.UserID,
		DisplayName:   p.DisplayName,
		TotalXP:       p.TotalXP,
		CurrentStreak: p.CurrentStreak,
		LongestStreak: p.LongestStreak,
		Rank:          r,
	}
}
