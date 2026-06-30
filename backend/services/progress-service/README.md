# progress-service (Golang)

XP, streaks, leaderboard. **DB:** `progress_db` + **Redis** (Sorted Sets). **Port:** 8003.

## Routes
| Method | Path | Notes |
|---|---|---|
| GET | /healthz | |
| GET | /progress/me | XP, current/longest streak |
| GET | /progress/{userId} | |
| GET | /leaderboard | `?scope=global&limit=50` via Redis ZREVRANGE |

`/progress/*` and `/leaderboard` sit behind the gateway's `jwt-auth` (which forwards `X-User-Id`). `leaderboard` reads the top-N from Redis, then joins `display_name` from `progress_db`.

## Consumers (RabbitMQ)
- `progress.user_registered` → creates `user_progress` (with `display_name` from the event), `ZADD` to the leaderboard.
- `progress.quiz_completed` → `+XP` (number of correct answers × `XPPerCorrect`=10), updates the streak (see `domain.NextStreak`), `ZADD leaderboard:global <total_xp> <userId>`.

**Idempotency:** each event is processed within a single transaction together with an insert into `processed_events(event_id)` (`ON CONFLICT DO NOTHING`) → exactly-once processing. Malformed payload → drop; transient error → `Nack(requeue)`.

## Build / test
```bash
go mod tidy
go test ./...          # unit test domain (streak, XP)
```
In Docker: migrations run automatically on startup. The pure logic (`internal/domain`) has unit tests; the full flow has been verified end-to-end through the gateway (XP/streak/leaderboard update when a quiz is submitted).
