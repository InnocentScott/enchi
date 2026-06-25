package config

import "os"

type Config struct {
	Port        string
	TTSProvider string // stub | google | azure (hiện chỉ stub được implement)
}

func Load() *Config {
	return &Config{
		Port:        getenv("PORT", "8005"),
		TTSProvider: getenv("TTS_PROVIDER", "stub"),
	}
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
