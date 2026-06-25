# media-service (Golang)

Text-to-Speech. **Port:** 8005. Không DB/event — leaf service. Route public (không qua jwt-auth).

## Routes
| Method | Path | Ghi chú |
|---|---|---|
| GET | /healthz | |
| GET | /media/audio | `?text=&lang=en` → stream audio (`audio/wav`), header `X-Cache: HIT/MISS` |
| POST | /media/audio/batch | `{items:[{text,lang}]}` → warm cache; trả `{warmed,total}` |

## TTS provider-agnostic
`internal/tts.Provider` interface; chọn impl qua env `TTS_PROVIDER`:
- `stub` (mặc định) — sinh WAV sine (tần số theo text) để mobile chạy thử pipeline audio.
- `google` / `azure` — **chốt sau**; hiện fallback về stub kèm cảnh báo.

Cache in-memory theo key = `sha256(lang + ":" + text)`. Khi tích hợp thật: thay stub bằng SDK provider + đẩy file lên Cloudflare R2 rồi trả/redirect URL.

## Build / test
```bash
go test ./...   # unit test stub (WAV hợp lệ, text khác → tone khác)
```
