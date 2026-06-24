# auth-service (Golang)

Quản lý tài khoản, đăng nhập/đăng ký, JWT. **DB:** `auth_db`. **Port:** 8001.

## Routes
| Method | Path | Ghi chú |
|---|---|---|
| GET | /healthz | |
| POST | /auth/register | publish `user_registered` |
| POST | /auth/login | trả access + refresh token |
| POST | /auth/refresh | |
| POST | /auth/logout | revoke refresh token |
| GET | /auth/verify | **ForwardAuth target** — verify JWT, set `X-User-Id` |
| GET/PATCH | /users/me | protected |

## TODO (Phase 1)
1. `go mod tidy` + thêm Fiber/Gin, golang-jwt, bcrypt, pgx, amqp091.
2. Migrations: `users`, `refresh_tokens`.
3. Implement `/auth/verify` (gateway phụ thuộc route này để bảo vệ các service khác).
4. Publish event `user_registered` (schema ở `libs/contracts`).

## Chạy local (không docker)
```bash
go run ./cmd/server   # :8001, /healthz trả ok
```
