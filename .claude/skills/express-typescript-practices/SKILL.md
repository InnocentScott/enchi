---
name: express-typescript-practices
description: Best practices for the EnChi srs-service (ExpressJS + TypeScript) implementing the SM-2 spaced-repetition algorithm. Use whenever writing, reviewing, or debugging code under services/srs-service — covers layered structure, strict TypeScript, zod validation, async error handling, pg data access, pure-domain algorithm design, RabbitMQ consumers, and testing. Load this before touching any file in srs-service.
---

# Express + TypeScript Practices (EnChi srs-service)

Applies to `srs-service`: the hardest part algorithm-wise (SM-2). Express is deliberately kept thin so the **algorithm logic stays unconstrained and is tested thoroughly**.

## Layered structure
```
src/
├── index.ts                # bootstrap: middleware -> routes -> error handler -> listen
├── routes/                 # define endpoints, attach validate + controller
├── controllers/            # read req -> call service -> return res (thin)
├── services/               # business orchestration
├── srs/sm2.ts              # PURE ALGORITHM — does not import express/pg
├── store/                  # repository (pg)
└── events/                 # rabbitmq consumer
```
Dependencies flow in one direction: `routes → controllers → services → store`. `srs/sm2.ts` is a pure function and depends on nothing.

## TypeScript
- `strict: true`. No `any`; use explicit types/interfaces, `unknown` at the boundary and then narrow.
- Enable `noUncheckedIndexedAccess` if possible. No `// @ts-ignore`.

## Validation & error handling
- Validate input with **zod** at the route boundary (`schema.parse(req.body)`); on failure → 400 error envelope.
- **Async errors**: Express 4 does not catch async errors automatically. Use an `asyncHandler(fn)` wrapper (or `express-async-errors`) so every `throw` flows into the **centralized error middleware** at the end of the chain.
- Error middleware (four parameters) maps errors → `{ code, message }` + status; unexpected errors → 500, log in full, and **do not** leak the stack to the client.

## Domain — SM-2 (`src/srs/sm2.ts`)
- Keep the **pure function** `review(state, quality)` (already provided). No I/O, no `Date.now` inside — pass `now` in if you need to compute `due_date`, so tests are deterministic.
- Every branch (q<3 reset, n=1→1d, n=2→6d, n≥3→round(I·EF), EF≥1.3) must have a **unit test** (`node --test`).

## Database (pg)
- A single `pg.Pool` instance; parameterized queries `$1` (prevents SQLi). Versioned migrations. Table `srs_cards(user_id, vocab_id, ease_factor, interval_days, repetitions, due_date, last_reviewed)`.

## RabbitMQ
- Consumer `srs.quiz_completed`: for each `result` in the event → compute `quality` → `review()` → upsert `srs_cards`. Manual ack, dedup by `eventId`, error → DLQ.

## Security & ops
- `helmet`, JSON body limit. Keep rate-limiting at the gateway. Read `X-User-Id` from the gateway; do not verify the JWT yourself.
- Graceful shutdown: close the `server`, `pool`, and RabbitMQ channel on SIGTERM.

## Anti-patterns (avoid)
- Logic in the controller; `async` routes that do not catch errors; string interpolation into SQL; `Date.now()` inside a pure function; swallowing errors; returning a stack trace to the client.
