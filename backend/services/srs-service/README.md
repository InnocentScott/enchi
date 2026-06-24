# srs-service (ExpressJS)

Spaced Repetition — thuật toán **SM-2**. **DB:** `srs_db`. **Port:** 8004.

## Routes
| Method | Path | Ghi chú |
|---|---|---|
| GET | /healthz | |
| GET | /srs/due | `?limit=20` — các từ tới hạn ôn |
| POST | /srs/answer | `{ vocabId, quality }` → cập nhật lịch |

## Thuật toán
`src/srs/sm2.ts` — đã implement `review(state, quality)` thuần (testable). DB/route gắn ở Phase 4.

## Consumer (RabbitMQ)
`srs.quiz_completed` → với mỗi `vocabId` trong event, upsert `srs_cards` qua `review()`.

## DB `srs_cards`
`(user_id, vocab_id, ease_factor, interval_days, repetitions, due_date, last_reviewed)`

## Setup (Phase 4)
```bash
npm install
npm run start:dev          # :8004
npm test                   # unit test cho sm2.ts
```
