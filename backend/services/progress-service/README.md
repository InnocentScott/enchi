# progress-service (Golang)

XP, streak, leaderboard. **DB:** `progress_db` + **Redis** (Sorted Sets). **Port:** 8003.

## Routes
| Method | Path | Ghi chú |
|---|---|---|
| GET | /healthz | |
| GET | /progress/me | XP, current/longest streak |
| GET | /progress/{userId} | |
| GET | /leaderboard | `?scope=global&limit=50` qua Redis ZREVRANGE |

## Consumers (RabbitMQ)
- `progress.quiz_completed` → +XP, update streak, `ZADD leaderboard:global <xp> <userId>`
- `progress.user_registered` → tạo `user_progress` mặc định (XP=0)

## TODO (Phase 3)
1. `go mod tidy` + Fiber, go-redis, pgx, amqp091.
2. Migration `user_progress`, `xp_log`.
3. Idempotency theo `eventId` khi cộng XP.
