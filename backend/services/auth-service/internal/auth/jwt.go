package auth

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const issuer = "enchi-auth"

// TokenManager ký/giải mã access & refresh token bằng HS256 với 2 secret tách biệt.
type TokenManager struct {
	accessSecret  []byte
	refreshSecret []byte
	accessTTL     time.Duration
	refreshTTL    time.Duration
}

func NewTokenManager(accessSecret, refreshSecret []byte, accessTTL, refreshTTL time.Duration) *TokenManager {
	return &TokenManager{
		accessSecret:  accessSecret,
		refreshSecret: refreshSecret,
		accessTTL:     accessTTL,
		refreshTTL:    refreshTTL,
	}
}

func (m *TokenManager) RefreshTTL() time.Duration { return m.refreshTTL }

func (m *TokenManager) GenerateAccess(userID string) (string, error) {
	return m.sign(userID, m.accessSecret, m.accessTTL)
}

func (m *TokenManager) GenerateRefresh(userID string) (string, error) {
	return m.sign(userID, m.refreshSecret, m.refreshTTL)
}

func (m *TokenManager) ParseAccess(token string) (string, error) {
	return m.parse(token, m.accessSecret)
}

func (m *TokenManager) ParseRefresh(token string) (string, error) {
	return m.parse(token, m.refreshSecret)
}

func (m *TokenManager) sign(userID string, secret []byte, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := jwt.RegisteredClaims{
		ID:        uuid.NewString(), // jti — đảm bảo mỗi token là duy nhất (tránh đụng token_hash khi cấp cùng giây)
		Subject:   userID,
		Issuer:    issuer,
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret)
}

func (m *TokenManager) parse(tokenStr string, secret []byte) (string, error) {
	claims := &jwt.RegisteredClaims{}
	_, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return secret, nil
	}, jwt.WithIssuer(issuer))
	if err != nil {
		return "", err
	}
	if claims.Subject == "" {
		return "", errors.New("missing subject")
	}
	return claims.Subject, nil
}

// HashToken băm refresh token để lưu DB. Token là JWT entropy cao nên sha256 là đủ
// (không cần bcrypt); cho phép tra cứu/revoke mà không lưu token gốc.
func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
