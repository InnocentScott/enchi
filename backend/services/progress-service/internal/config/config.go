package config

import (
	"errors"
	"os"
)

type Config struct {
	Port        string
	DatabaseURL string
	RedisURL    string
	RabbitURL   string
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:        getenv("PORT", "8003"),
		DatabaseURL: os.Getenv("PROGRESS_DATABASE_URL"),
		RedisURL:    os.Getenv("REDIS_URL"),
		RabbitURL:   os.Getenv("RABBITMQ_URL"),
	}
	if cfg.DatabaseURL == "" {
		return nil, errors.New("PROGRESS_DATABASE_URL is required")
	}
	if cfg.RedisURL == "" {
		return nil, errors.New("REDIS_URL is required")
	}
	if cfg.RabbitURL == "" {
		return nil, errors.New("RABBITMQ_URL is required")
	}
	return cfg, nil
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
