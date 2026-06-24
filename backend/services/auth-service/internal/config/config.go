// Package config đọc cấu hình từ env một lần lúc khởi động và fail-fast nếu thiếu.
package config

import (
	"errors"
	"fmt"
	"os"
	"time"
)

type Config struct {
	Port             string
	DatabaseURL      string
	RabbitURL        string
	JWTAccessSecret  []byte
	JWTRefreshSecret []byte
	AccessTTL        time.Duration
	RefreshTTL       time.Duration
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:             getenv("PORT", "8001"),
		DatabaseURL:      os.Getenv("AUTH_DATABASE_URL"),
		RabbitURL:        os.Getenv("RABBITMQ_URL"),
		JWTAccessSecret:  []byte(os.Getenv("JWT_ACCESS_SECRET")),
		JWTRefreshSecret: []byte(os.Getenv("JWT_REFRESH_SECRET")),
	}
	if cfg.DatabaseURL == "" {
		return nil, errors.New("AUTH_DATABASE_URL is required")
	}
	if cfg.RabbitURL == "" {
		return nil, errors.New("RABBITMQ_URL is required")
	}
	if len(cfg.JWTAccessSecret) == 0 || len(cfg.JWTRefreshSecret) == 0 {
		return nil, errors.New("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required")
	}
	var err error
	if cfg.AccessTTL, err = parseDuration("JWT_ACCESS_TTL", "15m"); err != nil {
		return nil, err
	}
	if cfg.RefreshTTL, err = parseDuration("JWT_REFRESH_TTL", "720h"); err != nil {
		return nil, err
	}
	return cfg, nil
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func parseDuration(key, def string) (time.Duration, error) {
	d, err := time.ParseDuration(getenv(key, def))
	if err != nil {
		return 0, fmt.Errorf("invalid %s: %w", key, err)
	}
	return d, nil
}
