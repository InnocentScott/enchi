package auth

import (
	"testing"
	"time"
)

func newTM() *TokenManager {
	return NewTokenManager([]byte("access-secret"), []byte("refresh-secret"), 15*time.Minute, 24*time.Hour)
}

func TestAccessTokenRoundTrip(t *testing.T) {
	tm := newTM()
	tok, err := tm.GenerateAccess("user-123")
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	uid, err := tm.ParseAccess(tok)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if uid != "user-123" {
		t.Errorf("subject = %q, want user-123", uid)
	}
}

// Access parser KHÔNG được chấp nhận refresh token (2 secret phải tách biệt).
func TestAccessRejectsRefreshToken(t *testing.T) {
	tm := newTM()
	refresh, _ := tm.GenerateRefresh("user-123")
	if _, err := tm.ParseAccess(refresh); err == nil {
		t.Error("access parser accepted a refresh token — secret separation broken")
	}
}

func TestExpiredTokenRejected(t *testing.T) {
	tm := NewTokenManager([]byte("a"), []byte("b"), -1*time.Minute, time.Hour)
	tok, _ := tm.GenerateAccess("u")
	if _, err := tm.ParseAccess(tok); err == nil {
		t.Error("expired token accepted")
	}
}

// Regression: 2 token cấp liên tiếp cho cùng user (cùng giây) phải KHÁC nhau,
// nếu không sẽ đụng UNIQUE token_hash khi lưu refresh token.
func TestTokensAreUniquePerIssue(t *testing.T) {
	tm := newTM()
	a1, _ := tm.GenerateRefresh("user-1")
	a2, _ := tm.GenerateRefresh("user-1")
	if a1 == a2 {
		t.Error("two refresh tokens for same user are identical — sẽ đụng token_hash")
	}
	if HashToken(a1) == HashToken(a2) {
		t.Error("token hashes collide for distinct issues")
	}
}

func TestHashTokenDeterministic(t *testing.T) {
	if HashToken("abc") != HashToken("abc") {
		t.Error("hash not deterministic")
	}
	if HashToken("abc") == HashToken("abd") {
		t.Error("different inputs produced same hash")
	}
}
