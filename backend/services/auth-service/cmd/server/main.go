// Auth & User Service (Golang). Wiring: config -> deps -> router -> graceful shutdown.
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

	"github.com/tomovu/enchi/services/auth-service/internal/auth"
	"github.com/tomovu/enchi/services/auth-service/internal/config"
	"github.com/tomovu/enchi/services/auth-service/internal/events"
	httpapi "github.com/tomovu/enchi/services/auth-service/internal/http"
	"github.com/tomovu/enchi/services/auth-service/internal/service"
	"github.com/tomovu/enchi/services/auth-service/internal/store"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil)).With("service", "auth-service")

	cfg, err := config.Load()
	if err != nil {
		log.Error("config", "err", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	pool, err := store.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Error("db connect", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := store.RunMigrations(ctx, pool); err != nil {
		log.Error("migrations", "err", err)
		os.Exit(1)
	}

	pub, err := events.NewPublisher(cfg.RabbitURL)
	if err != nil {
		log.Error("rabbitmq connect", "err", err)
		os.Exit(1)
	}
	defer pub.Close()

	tm := auth.NewTokenManager(cfg.JWTAccessSecret, cfg.JWTRefreshSecret, cfg.AccessTTL, cfg.RefreshTTL)
	svc := service.New(store.NewPgUserStore(pool), store.NewPgRefreshTokenStore(pool), tm, pub, log)
	router := httpapi.NewRouter(httpapi.NewHandlers(svc), log)

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
