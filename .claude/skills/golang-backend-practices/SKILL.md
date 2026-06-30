---
name: golang-backend-practices
description: Best practices for the EnChi Go backend services (auth-service, progress-service, media-service). Use whenever writing, reviewing, or debugging Go code in services/*-service — covers project layout, config, net/http routing, pgx + migrations, JWT/bcrypt, RabbitMQ consumers, structured logging, graceful shutdown, concurrency, error handling, and testing. Load this before touching any .go file in this repo.
---

# Golang Backend Practices (EnChi)

Applies to `auth-service`, `progress-service`, `media-service`. Goal: idiomatic Go, few dependencies, easy to test.

## Project layout (per service)
```
service/
├── cmd/server/main.go      # wiring: config -> deps -> router -> graceful shutdown
├── internal/
│   ├── config/             # read env, fail-fast
│   ├── http/               # handlers, middleware, router (NO business logic)
│   ├── domain/             # entity + pure business rules (testable, does not import http/db)
│   ├── store/              # repository: pgx / redis (interface + impl)
│   └── events/             # rabbitmq publisher/consumer
├── migrations/             # .sql (golang-migrate or goose)
└── go.mod
```
`internal/` = not exported outside the module. Dependencies flow in **one direction**: `http → domain ← store`. Domain knows nothing about HTTP/DB.

## HTTP
- **Default to the stdlib `net/http`** + `http.ServeMux` (Go 1.22 routing: `mux.HandleFunc("POST /auth/login", h)`). Do not add a framework without a clear reason; if one is needed, use `chi` (a pure router) or Fiber.
- Thin handlers: parse → validate → call service/domain → map the result/err to HTTP. Do not embed logic.
- Middleware chain: recover → requestID → logging → (auth if needed). A `panic` must be recovered, never crash the process.
- Return JSON via a single helper `writeJSON(w, status, v)` and `writeError(w, status, code, msg)` (standard error envelope `{code,message}`).

## Config
- Read env **once** at startup into a `Config` struct; missing required variables → `log.Fatal`. Do not scatter `os.Getenv` calls.
- DSN, secrets, and queue URLs all come from env (see `.env.example`).

## Database (pgx/v5)
- Use `pgxpool.Pool`, initialized once and passed down to the store via DI (as a parameter), **not** a global variable.
- **Always** use parameterized queries (`$1,$2`) — no string interpolation (prevents SQLi).
- Use `context.Context` for every query; set a timeout (`context.WithTimeout`).
- Versioned migrations in `migrations/` (golang-migrate). Do not create tables in code at runtime.
- The repository is an **interface** in domain/store, with a separate pgx implementation → mockable in tests.

## Auth & crypto
- Password: `golang.org/x/crypto/bcrypt` (cost ≥ 12). Do not write your own hashing.
- JWT: `github.com/golang-jwt/jwt/v5`. Short access token (15m), longer refresh token + store its hash in the DB so it can be revoked.
- `/auth/verify` (ForwardAuth target): read `Authorization: Bearer`, verify the signature + exp, return `200` with the `X-User-Id` header, or `401`. This is the security anchor of the whole system — test it thoroughly.
- Compare tokens/secrets with `hmac.Equal` / `subtle.ConstantTimeCompare` when you need to avoid a timing attack.

## Concurrency & lifecycle
- The RabbitMQ consumer and HTTP server run concurrently; manage them with `errgroup` or a goroutine + channel.
- **Graceful shutdown**: catch `SIGINT/SIGTERM` (`signal.NotifyContext`), call `server.Shutdown(ctx)`, close the pool/conn. Do not lose a message that is being processed.
- No goroutine leaks: every goroutine has an exit condition tied to `ctx.Done()`.

## RabbitMQ (`amqp091-go`)
- Publisher: confirm mode; payload matches the `libs/contracts` schema. Attach `eventId` (uuid) and `occurredAt`.
- Consumer: **manual ack**; `Ack` only after processing succeeds, `Nack(requeue)` on a transient error, permanent error → DLQ. Dedup by `eventId` (table `processed_events`).

## Logging & errors
- `log/slog` (stdlib) JSON handler. Fields `service`, `request_id`. Do not log secrets.
- Errors: return explicit `error` values, wrapping context with `fmt.Errorf("...: %w", err)`. Use a sentinel error (`var ErrNotFound = errors.New(...)`) for cases that need to be distinguished; map it to HTTP at the handler layer. Do not `panic` for business errors.

## Testing
- Table-driven tests (`tt := []struct{...}`), run with `t.Run`. Pure domain logic is tested without a DB.
- HTTP: `net/http/httptest`. Store: mock via the interface. The goal is to cover branch logic, not a coverage number.

## Anti-patterns (avoid)
- Business logic in handlers; mutable global variables; careless `interface{}`/`any`; swallowing errors (`_ = err`); string-interpolated queries; low default bcrypt cost; dropping `ctx`.
