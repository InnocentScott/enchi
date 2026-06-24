// Media Service / Text-to-Speech (Golang) — scaffold.
// text+lang -> check cache R2 -> (miss) gọi TTS provider, upload R2 -> trả URL.
// Provider chốt sau: dùng interface TTSProvider (provider-agnostic), env TTS_PROVIDER=stub|google|azure.
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
)

const serviceName = "media-service"

// TTSProvider — interface provider-agnostic. Impl: stubProvider | googleProvider | azureProvider.
type TTSProvider interface {
	Synthesize(text, lang string) (audio []byte, contentType string, err error)
}

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", health)
	mux.HandleFunc("GET /media/audio", notImplemented)        // ?text=&lang= -> 302 R2 URL hoặc stream
	mux.HandleFunc("POST /media/audio/batch", notImplemented) // preload audio cho 1 bài học

	log.Printf("TTS_PROVIDER=%s", envOr("TTS_PROVIDER", "stub"))

	port := envOr("PORT", "8005")
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
