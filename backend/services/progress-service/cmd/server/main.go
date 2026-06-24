// Progress & Leaderboard Service (Golang) — scaffold.
// XP, streak (Postgres) + leaderboard (Redis Sorted Sets). Consume quiz_completed + user_registered.
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
)

const serviceName = "progress-service"

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", health)
	mux.HandleFunc("GET /progress/me", notImplemented)
	mux.HandleFunc("GET /progress/{userId}", notImplemented)
	mux.HandleFunc("GET /leaderboard", notImplemented)

	// TODO: khởi động consumers RabbitMQ trong goroutine:
	//   - progress.quiz_completed  -> +XP, update streak, ZADD leaderboard:global
	//   - progress.user_registered -> tạo record user_progress mặc định

	port := envOr("PORT", "8003")
	log.Printf("%s listening on :%s", serviceName, port)
	if err := http.ListenAndServe(":"+port, logRequests(mux)); err != nil {
		log.Fatal(err)
	}
}

func health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": serviceName})
}

func notImplemented(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusNotImplemented, map[string]string{
		"code":    "NOT_IMPLEMENTED",
		"message": r.Method + " " + r.URL.Path + " chưa được implement",
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
