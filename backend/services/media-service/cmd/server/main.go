// Media Service / Text-to-Speech (Golang).
// text+lang -> cache -> (miss) TTS provider sinh audio -> trả bytes. Provider stub (chốt provider sau).
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/tomovu/enchi/services/media-service/internal/cache"
	"github.com/tomovu/enchi/services/media-service/internal/config"
	httpapi "github.com/tomovu/enchi/services/media-service/internal/http"
	"github.com/tomovu/enchi/services/media-service/internal/tts"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil)).With("service", "media-service")

	cfg := config.Load()
	log.Info("tts provider", "provider", cfg.TTSProvider)

	provider := tts.New(cfg.TTSProvider, log)
	router := httpapi.NewRouter(httpapi.NewHandlers(provider, cache.New()), log)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
	}
	go func() {
		log.Info("listening", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("server", "err", err)
			stop()
		}
	}()

	<-ctx.Done()
	log.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error("shutdown", "err", err)
	}
}
