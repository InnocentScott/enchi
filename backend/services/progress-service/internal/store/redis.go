package store

import (
	"context"
	"errors"

	"github.com/redis/go-redis/v9"
)

const leaderboardKey = "leaderboard:global"

type LeaderboardEntry struct {
	UserID string
	XP     int
}

type RedisStore struct {
	rdb *redis.Client
}

func NewRedis(ctx context.Context, url string) (*RedisStore, error) {
	opt, err := redis.ParseURL(url)
	if err != nil {
		return nil, err
	}
	rdb := redis.NewClient(opt)
	if err := rdb.Ping(ctx).Err(); err != nil {
		_ = rdb.Close()
		return nil, err
	}
	return &RedisStore{rdb: rdb}, nil
}

// SetScore đặt điểm tuyệt đối (total_xp) cho user trên Sorted Set.
func (s *RedisStore) SetScore(ctx context.Context, userID string, xp int) error {
	return s.rdb.ZAdd(ctx, leaderboardKey, redis.Z{Score: float64(xp), Member: userID}).Err()
}

// Rank trả hạng 0-based (cao điểm nhất = 0); -1 nếu chưa có trên bảng.
func (s *RedisStore) Rank(ctx context.Context, userID string) (int64, error) {
	r, err := s.rdb.ZRevRank(ctx, leaderboardKey, userID).Result()
	if errors.Is(err, redis.Nil) {
		return -1, nil
	}
	return r, err
}

func (s *RedisStore) Top(ctx context.Context, limit int) ([]LeaderboardEntry, error) {
	zs, err := s.rdb.ZRevRangeWithScores(ctx, leaderboardKey, 0, int64(limit-1)).Result()
	if err != nil {
		return nil, err
	}
	out := make([]LeaderboardEntry, 0, len(zs))
	for _, z := range zs {
		member, _ := z.Member.(string)
		out = append(out, LeaderboardEntry{UserID: member, XP: int(z.Score)})
	}
	return out, nil
}

func (s *RedisStore) Close() error { return s.rdb.Close() }
