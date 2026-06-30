# srs-service (ExpressJS)

Spaced Repetition — the **SM-2** algorithm. **DB:** `srs_db`. **Port:** 8004.

## Routes
| Method | Path | Notes |
|---|---|---|
| GET | /healthz | |
| GET | /srs/due | `?limit=20` — vocabulary items due for review |
| POST | /srs/answer | `{ vocabId, quality }` → update the schedule |

Layering: `http` (routes/async-handler/error) → `service` → `store` → `srs/sm2.ts` (pure). `/srs/*` reads the `X-User-Id` forwarded by the gateway. Input is validated with **zod**; async errors flow through centralized error middleware.

## Algorithm
`src/srs/sm2.ts` — `review(state, quality)` is pure (unit-tested, jest). `store` computes `due_date = today + intervalDays` and upserts the card.

## Consumer (RabbitMQ)
`srs.quiz_completed` → for each `result {vocabId, correct, quality}` in the event, upsert `srs_cards` via `review()`. Deduplicated by `eventId` (`processed_events`, same transaction) → idempotent.

## DB `srs_cards`
`(user_id, vocab_id, ease_factor, interval_days, repetitions, due_date, last_reviewed)` — PK `(user_id, vocab_id)`.

## Setup
```bash
npm install
npm test                   # unit test sm2 (jest)
npm run build
npm run start:dev          # :8004 (requires SRS_DATABASE_URL, RABBITMQ_URL)
```
In Docker: migrations run automatically on startup. Verified end-to-end: submitting a quiz → cards are created; answer/due work as expected.
