# media-service (Golang)

Text-to-Speech → cache → Cloudflare R2. **Port:** 8005. Không dùng Postgres (chỉ R2 + cache).

## Routes
| Method | Path | Ghi chú |
|---|---|---|
| GET | /healthz | |
| GET | /media/audio | `?text=&lang=en` → 302 R2 URL hoặc stream |
| POST | /media/audio/batch | preload audio cho 1 bài học |

## TTS provider-agnostic
`TTSProvider` interface trong `main.go`. Chọn impl qua env `TTS_PROVIDER`:
- `stub` (mặc định, scaffold) — trả audio giả/silent để dev FE.
- `google` — Google Cloud Text-to-Speech.
- `azure` — Azure Speech.

> Provider **chốt sau** (Media làm cuối, Phase 5). Scaffold chỉ định nghĩa interface.

## TODO (Phase 5)
1. `go mod tidy` + Fiber, aws-sdk-go-v2 (R2), SDK provider đã chọn.
2. Cache key = hash(text+lang); check R2 trước khi gọi TTS.
