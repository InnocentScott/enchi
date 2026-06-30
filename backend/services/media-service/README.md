# media-service (Golang)

Text-to-Speech. **Port:** 8005. No DB/events — a leaf service. Public route (not behind jwt-auth).

## Routes
| Method | Path | Notes |
|---|---|---|
| GET | /healthz | |
| GET | /media/audio | `?text=&lang=en` → stream audio (`audio/wav`), header `X-Cache: HIT/MISS` |
| POST | /media/audio/batch | `{items:[{text,lang}]}` → warm cache; returns `{warmed,total}` |

## Provider-agnostic TTS
`internal/tts.Provider` interface; pick the impl via the `TTS_PROVIDER` env var:
- `stub` (default) — generates a WAV sine wave (frequency derived from the text) so mobile can test-drive the audio pipeline.
- `google` / `azure` — **to be decided later**; currently falls back to the stub with a warning.

In-memory cache keyed by `sha256(lang + ":" + text)`. For real integration: replace the stub with a provider SDK + upload the file to Cloudflare R2, then return/redirect to the URL.

## Build / test
```bash
go test ./...   # unit test stub (valid WAV, different text → different tone)
```
