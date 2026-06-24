---
name: golang-backend-practices
description: Best practices for the EnChi Go backend services (auth-service, progress-service, media-service). Use whenever writing, reviewing, or debugging Go code in services/*-service — covers project layout, config, net/http routing, pgx + migrations, JWT/bcrypt, RabbitMQ consumers, structured logging, graceful shutdown, concurrency, error handling, and testing. Load this before touching any .go file in this repo.
---

# Golang Backend Practices (EnChi)

Áp dụng cho `auth-service`, `progress-service`, `media-service`. Mục tiêu: idiomatic Go, ít dependency, dễ test.

## Project layout (mỗi service)
```
service/
├── cmd/server/main.go      # wiring: config -> deps -> router -> graceful shutdown
├── internal/
│   ├── config/             # đọc env, fail-fast
│   ├── http/               # handlers, middleware, router (KHÔNG chứa business logic)
│   ├── domain/             # entity + business rules thuần (testable, không import http/db)
│   ├── store/              # repository: pgx / redis (interface + impl)
│   └── events/             # rabbitmq publisher/consumer
├── migrations/             # .sql (golang-migrate hoặc goose)
└── go.mod
```
`internal/` = không export ra ngoài module. Phụ thuộc đi **1 chiều**: `http → domain ← store`. Domain không biết HTTP/DB.

## HTTP
- **Mặc định dùng stdlib `net/http`** + `http.ServeMux` (Go 1.22 routing: `mux.HandleFunc("POST /auth/login", h)`). Không thêm framework trừ khi có lý do rõ; nếu cần, dùng `chi` (router thuần) hoặc Fiber.
- Handler mỏng: parse → validate → gọi service/domain → map kết quả/err sang HTTP. Không nhúng logic.
- Middleware chain: recover → requestID → logging → (auth nếu cần). `panic` phải được recover, không làm sập process.
- Trả JSON qua 1 helper `writeJSON(w, status, v)` và `writeError(w, status, code, msg)` (error envelope chuẩn `{code,message}`).

## Config
- Đọc env **một lần** lúc khởi động vào struct `Config`; thiếu biến bắt buộc → `log.Fatal`. Không gọi `os.Getenv` rải rác.
- DSN, secret, URL queue đều từ env (xem `.env.example`).

## Database (pgx/v5)
- Dùng `pgxpool.Pool`, khởi tạo 1 lần, truyền xuống store qua DI (tham số), **không** biến global.
- **Luôn** dùng query tham số hoá (`$1,$2`) — không nội suy chuỗi (chống SQLi).
- `context.Context` cho mọi query; set timeout (`context.WithTimeout`).
- Migrations versioned trong `migrations/` (golang-migrate). Không tạo bảng bằng code lúc runtime.
- Repository là **interface** ở domain/store, impl pgx riêng → mock được khi test.

## Auth & crypto
- Password: `golang.org/x/crypto/bcrypt` (cost ≥ 12). Không tự viết hashing.
- JWT: `github.com/golang-jwt/jwt/v5`. Access token ngắn (15m), refresh dài + lưu hash trong DB để revoke.
- `/auth/verify` (ForwardAuth target): đọc `Authorization: Bearer`, verify chữ ký + exp, trả `200` kèm header `X-User-Id`, hoặc `401`. Đây là điểm tựa bảo mật của cả hệ thống — test kỹ.
- So sánh token/secret bằng `hmac.Equal` / `subtle.ConstantTimeCompare` khi cần tránh timing attack.

## Concurrency & lifecycle
- Consumer RabbitMQ và HTTP server chạy song song; quản lý bằng `errgroup` hoặc goroutine + channel.
- **Graceful shutdown**: bắt `SIGINT/SIGTERM` (`signal.NotifyContext`), `server.Shutdown(ctx)`, đóng pool/conn. Không để mất message đang xử lý.
- Không rò goroutine: mọi goroutine có điều kiện thoát gắn với `ctx.Done()`.

## RabbitMQ (`amqp091-go`)
- Publisher: confirm mode; payload khớp schema `libs/contracts`. Đính `eventId` (uuid), `occurredAt`.
- Consumer: **manual ack**; xử lý xong mới `Ack`, lỗi tạm thời `Nack(requeue)`, lỗi vĩnh viễn → DLQ. Dedup theo `eventId` (bảng `processed_events`).

## Logging & errors
- `log/slog` (stdlib) JSON handler. Field `service`, `request_id`. Không log secret.
- Lỗi: trả `error` tường minh, bọc ngữ cảnh `fmt.Errorf("...: %w", err)`. Sentinel error (`var ErrNotFound = errors.New(...)`) cho case cần phân biệt; map sang HTTP ở tầng handler. Không `panic` cho lỗi nghiệp vụ.

## Testing
- Table-driven test (`tt := []struct{...}`), chạy `t.Run`. Domain logic test thuần không cần DB.
- HTTP: `net/http/httptest`. Store: mock qua interface. Mục tiêu phủ logic nhánh, không phải con số coverage.

## Anti-patterns (tránh)
- Business logic trong handler; biến global mutable; `interface{}`/`any` tuỳ tiện; nuốt lỗi (`_ = err`); query nội suy chuỗi; bcrypt cost mặc định thấp; bỏ `ctx`.
