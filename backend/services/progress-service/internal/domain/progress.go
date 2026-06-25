package domain

import (
	"errors"
	"time"
)

var ErrNotFound = errors.New("progress not found")

type Progress struct {
	UserID         string
	DisplayName    string
	TotalXP        int
	CurrentStreak  int
	LongestStreak  int
	LastActiveDate *time.Time
}

// XP cộng cho một lần hoàn thành quiz = số câu đúng * XPPerCorrect.
const XPPerCorrect = 10

func XPForQuiz(score int) int {
	if score < 0 {
		score = 0
	}
	return score * XPPerCorrect
}

// NextStreak tính chuỗi ngày học liên tiếp (pure, dễ test).
// - chưa từng hoạt động -> 1
// - đã hoạt động hôm nay -> giữ nguyên (tối thiểu 1)
// - hoạt động lần cuối hôm qua -> +1
// - cách quãng -> reset về 1
func NextStreak(last *time.Time, now time.Time, current int) (int, time.Time) {
	today := dateOnly(now)
	if last == nil {
		return 1, today
	}
	lastDay := dateOnly(*last)
	switch {
	case lastDay.Equal(today):
		if current < 1 {
			return 1, today
		}
		return current, today
	case lastDay.Equal(today.AddDate(0, 0, -1)):
		return current + 1, today
	default:
		return 1, today
	}
}

func dateOnly(t time.Time) time.Time {
	u := t.UTC()
	return time.Date(u.Year(), u.Month(), u.Day(), 0, 0, 0, 0, time.UTC)
}
