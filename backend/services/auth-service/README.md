# auth-service (Golang)

Manages accounts, login/registration, and JWT. **DB:** `auth_db`. **Port:** 8001.

## Routes
| Method | Path | Notes |
|---|---|---|
| GET | /healthz | |
| POST | /auth/register | publishes `user_registered` |
| POST | /auth/login | returns access + refresh token |
| POST | /auth/refresh | |
| POST | /auth/logout | revoke refresh token |
| GET | /auth/verify | **ForwardAuth target** — verify JWT, set `X-User-Id` |
| GET/PATCH | /users/me | protected |

## TODO (Phase 1)
1. `go mod tidy` + add Fiber/Gin, golang-jwt, bcrypt, pgx, amqp091.
2. Migrations: `users`, `refresh_tokens`.
3. Implement `/auth/verify` (the gateway depends on this route to protect the other services).
4. Publish the `user_registered` event (schema in `libs/contracts`).

## Run locally (without docker)
```bash
go run ./cmd/server   # :8001, /healthz returns ok
```
