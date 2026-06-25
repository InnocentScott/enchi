package domain

import (
	"testing"
	"time"
)

func TestXPForQuiz(t *testing.T) {
	cases := map[int]int{0: 0, 3: 30, 5: 50, -2: 0}
	for score, want := range cases {
		if got := XPForQuiz(score); got != want {
			t.Errorf("XPForQuiz(%d) = %d, want %d", score, got, want)
		}
	}
}

func TestNextStreak(t *testing.T) {
	now := time.Date(2026, 6, 25, 10, 0, 0, 0, time.UTC)
	yesterday := now.AddDate(0, 0, -1)
	twoDaysAgo := now.AddDate(0, 0, -2)
	today := dateOnly(now)

	tests := []struct {
		name    string
		last    *time.Time
		current int
		want    int
	}{
		{"first ever", nil, 0, 1},
		{"again same day keeps streak", &today, 3, 3},
		{"consecutive day increments", &yesterday, 3, 4},
		{"gap resets", &twoDaysAgo, 5, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, gotDate := NextStreak(tt.last, now, tt.current)
			if got != tt.want {
				t.Errorf("streak = %d, want %d", got, tt.want)
			}
			if !gotDate.Equal(today) {
				t.Errorf("lastActive = %v, want %v", gotDate, today)
			}
		})
	}
}
