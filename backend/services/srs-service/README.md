# srs-service (ExpressJS)

Spaced Repetition — thuật toán **SM-2**. **DB:** `srs_db`. **Port:** 8004.

## Routes
| Method | Path | Ghi chú |
|---|---|---|
| GET | /healthz | |
| GET | /srs/due | `?limit=20` — các từ tới hạn ôn |
| POST | /srs/answer | `{ vocabId, quality }` → cập nhật lịch |

Phân tầng: `http` (routes/async-handler/error) → `service` → `store` → `srs/sm2.ts` (pure). `/srs/*` đọc `X-User-Id` do gateway forward. Input validate bằng **zod**; lỗi async đi qua error middleware tập trung.

## Thuật toán
`src/srs/sm2.ts` — `review(state, quality)` thuần (unit-tested, jest). `store` tính `due_date = today + intervalDays` và upsert thẻ.

## Consumer (RabbitMQ)
`srs.quiz_completed` → với mỗi `result {vocabId, correct, quality}` trong event, upsert `srs_cards` qua `review()`. Dedup theo `eventId` (`processed_events`, cùng transaction) → idempotent.

## DB `srs_cards`
`(user_id, vocab_id, ease_factor, interval_days, repetitions, due_date, last_reviewed)` — PK `(user_id, vocab_id)`.

## Setup
```bash
npm install
npm test                   # unit test sm2 (jest)
npm run build
npm run start:dev          # :8004 (cần SRS_DATABASE_URL, RABBITMQ_URL)
```
Trong Docker: tự chạy migration lúc khởi động. Đã verify e2e: nộp quiz → thẻ được tạo; answer/due hoạt động.
