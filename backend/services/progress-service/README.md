# progress-service (Golang)

XP, streak, leaderboard. **DB:** `progress_db` + **Redis** (Sorted Sets). **Port:** 8003.

## Routes
| Method | Path | Ghi chú |
|---|---|---|
| GET | /healthz | |
| GET | /progress/me | XP, current/longest streak |
| GET | /progress/{userId} | |
| GET | /leaderboard | `?scope=global&limit=50` qua Redis ZREVRANGE |

`/progress/*` và `/leaderboard` nằm sau `jwt-auth` của gateway (forward `X-User-Id`). `leaderboard` đọc top-N từ Redis rồi join `display_name` từ `progress_db`.

## Consumers (RabbitMQ)
- `progress.user_registered` → tạo `user_progress` (kèm `display_name` từ event), `ZADD` leaderboard.
- `progress.quiz_completed` → `+XP` (số câu đúng × `XPPerCorrect`=10), cập nhật streak (xem `domain.NextStreak`), `ZADD leaderboard:global <total_xp> <userId>`.

**Idempotency:** mỗi event xử lý trong 1 transaction cùng việc insert `processed_events(event_id)` (`ON CONFLICT DO NOTHING`) → xử lý đúng-một-lần. Payload hỏng → drop; lỗi tạm thời → `Nack(requeue)`.

## Build / test
```bash
go mod tidy
go test ./...          # unit test domain (streak, XP)
```
Trong Docker: tự chạy migration lúc khởi động. Logic thuần (`internal/domain`) có unit test; toàn luồng đã verify e2e qua gateway (XP/streak/leaderboard cập nhật khi nộp quiz).
