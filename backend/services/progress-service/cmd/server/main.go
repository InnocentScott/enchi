// Progress & Leaderboard Service (Golang).
// XP + streak (Postgres) + leaderboard (Redis). Consume quiz_completed + user_registered.
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

	"github.com/tomovu/enchi/services/progress-service/internal/config"
	"github.com/tomovu/enchi/services/progress-service/internal/events"
	httpapi "github.com/tomovu/enchi/services/progress-service/internal/http"
	"github.com/tomovu/enchi/services/progress-service/internal/service"
	"github.com/tomovu/enchi/services/progress-service/internal/store"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil)).With("service", "progress-service")

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

	rdb, err := store.NewRedis(ctx, cfg.RedisURL)
	if err != nil {
		log.Error("redis connect", "err", err)
		os.Exit(1)
	}
	defer rdb.Close()

	svc := service.New(store.NewProgressStore(pool), rdb, log)

	consumer, err := events.NewConsumer(cfg.RabbitURL, svc, log)
	if err != nil {
		log.Error("rabbitmq connect", "err", err)
		os.Exit(1)
	}
	defer consumer.Close()
	go func() {
		if err := consumer.Start(ctx); err != nil {
			log.Error("consumer", "err", err)
			stop()
		}
	}()

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           httpapi.NewRouter(httpapi.NewHandlers(svc), log),
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
