# 🛠️ Backend Plan — Language Learning App (Polyglot Microservices)

> Following `implementation_plan_learning_app.md`: **Easy → Golang, Medium → NestJS, Hard → ExpressJS**.
> Communication: **REST** (client → service) + **RabbitMQ** (asynchronous events between services).
> Shared infrastructure: **PostgreSQL + Redis + RabbitMQ** via `docker-compose`.

---

## 0. Foundational architecture decisions (do these first)

- **API Gateway / BFF:** The mobile app should only need to know **1 entrypoint**. We propose a **Traefik** or **Nginx** reverse proxy that routes by path (`/auth`, `/content`, `/progress`, `/srs`, `/media`). The gateway handles: TLS, rate limiting, and **centralized JWT authentication** (forwarding `X-User-Id` down to the services).
- **Database per service** (true to the microservices spirit): each service has its own Postgres schema/DB and does **not** share tables. Data is linked via ID + events, not via cross-service JOINs.
- **Common standards:** every service exposes `/healthz`, logs include a `request_id`, and a unified error envelope `{ code, message, details }`.
- **Auth contract:** access token (JWT, short-lived ~15m) + refresh token (long-lived, stored in DB/Redis for revocation).

---

## 1. Per-Service Details

### 🟢 Auth & User Service — Golang (Easy)
- **Framework:** Fiber or Gin; **sqlc** or GORM; **bcrypt**; **golang-jwt**.
- **DB (Postgres `auth_db`):** `users(id, email, password_hash, display_name, created_at)`, `refresh_tokens(id, user_id, token_hash, expires_at, revoked)`.
- **Endpoints:**
  - `POST /auth/register`, `POST /auth/login`
  - `POST /auth/refresh`, `POST /auth/logout`
  - `GET /users/me`, `PATCH /users/me`
- **Event published:** `user_registered` (so other services can initialize default data, e.g. Progress creating an XP=0 record).

### 🟢 Progress & Leaderboard Service — Golang (Easy)
- **Framework:** Fiber/Gin; **Redis** (Sorted Sets for the leaderboard); Postgres for durable data.
- **DB (`progress_db`):** `user_progress(user_id, total_xp, current_streak, longest_streak, last_active_date)`, `xp_log(...)`.
- **Redis:** `ZADD leaderboard:global <xp> <user_id>` → blazing-fast rank/top-N queries.
- **Endpoints:**
  - `GET /progress/me`, `GET /progress/:userId`
  - `GET /leaderboard?scope=global&limit=50`
- **Event consumed:** `quiz_completed` → add XP, update streak, `ZADD` to the leaderboard.
- **Event consumed:** `user_registered` → create a default progress record.

### 🟢 Media Service (Text-to-Speech) — Golang (Easy)
- **Framework:** Fiber/Gin; **Google/Azure TTS** SDK; **Cloudflare R2** (S3-compatible, using aws-sdk-go).
- **Flow:** receive `text + lang` → check the cache (R2 key = hash) → if missing, call TTS, compress, upload to R2 → return the URL (or stream).
- **DB/cache:** an `audio_cache(hash, lang, r2_key, created_at)` table, or simply check for existence on R2.
- **Endpoints:**
  - `GET /media/audio?text=...&lang=en` → 302 redirect to the R2 URL **or** stream.
  - `POST /media/audio/batch` (preload for a single lesson).

### 🟡 Content Service — NestJS (Medium)
- **Framework:** NestJS + **Prisma** (or TypeORM); Postgres; **class-validator** for DTOs.
- **DB (`content_db`) — deeply relational:**
  - `Course 1—n Lesson 1—n Vocabulary`
  - `Lesson 1—n Quiz`, `Quiz 1—n Question`, `Question 1—n Option` (multiple-choice / matching)
- **Endpoints:**
  - `GET /courses`, `GET /courses/:id`
  - `GET /lessons/:id` (including vocab)
  - `GET /quizzes/:lessonId`, `POST /quizzes/:id/submit`
  - Admin CRUD for content (gated by a separate admin-role guard)
- **Event published:** `quiz_completed { userId, quizId, vocabIds[], correctMap }` after grading → picked up by both Progress & SRS.

### 🔴 SRS Service (Spaced Repetition) — ExpressJS (Algorithmically hard)
- **Framework:** ExpressJS + TypeScript (freedom to code the **SM-2 / SuperMemo** algorithm); Postgres.
- **DB (`srs_db`):** `srs_cards(user_id, vocab_id, ease_factor, interval_days, repetitions, due_date, last_reviewed)`.
- **SM-2 algorithm:** based on answer quality (0–5) → update `ease_factor`, `interval`, `due_date`.
- **Endpoints:**
  - `GET /srs/due?limit=20` → the words due for review today
  - `POST /srs/answer { vocabId, quality }` → update the schedule
- **Event consumed:** `quiz_completed` → create/update `srs_cards` for the given `vocabIds` (correct/incorrect → quality).

---

## 2. RabbitMQ — Topology & Event Flow

- **Exchange:** `learning.events` (type `topic`).
- **Routing keys:** `quiz.completed`, `user.registered`.
- **Queues (one queue per consumer, each bound separately):**
  - `progress.quiz_completed` ← `quiz.completed`
  - `srs.quiz_completed` ← `quiz.completed`
  - `progress.user_registered` ← `user.registered`
- **Guarantees:** use **manual ack**, a **DLQ** (dead-letter) for failed messages, and an **idempotency key** (e.g. `quizSubmissionId`) so consumers process exactly-once.

**`quiz_completed` flow:**
```
Mobile → POST /quizzes/:id/submit (Content)
Content grades, saves the submission, publishes quiz.completed
   ├─→ Progress: +XP, update streak, ZADD leaderboard
   └─→ SRS:      update srs_cards (new due_date per SM-2)
Mobile invalidates: progress/me, srs/due, leaderboard
```

---

## 3. Repo structure (backend)

> `enchi/` is the umbrella containing 2 repos: `backend/` (this file) and `mobile/` (see `plan_frontend.md`).

```text
enchi/backend/
├── services/
│   ├── auth-service/        (Golang)
│   ├── progress-service/    (Golang)
│   ├── media-service/       (Golang)
│   ├── content-service/     (NestJS)
│   └── srs-service/         (ExpressJS)
├── libs/
│   ├── proto-or-contracts/  # JSON schema / OpenAPI for shared event payloads
│   └── go-shared/           # JWT middleware, logger, rabbitmq helper (Go)
├── gateway/                 # Traefik/Nginx config
└── docker-compose.yml       # Postgres + Redis + RabbitMQ + 5 services + gateway
```

---

## 4. Implementation roadmap (Phases)

### Phase 0 — Infrastructure & scaffolding (1 week)
- [ ] `docker-compose`: Postgres, Redis, RabbitMQ (+ management UI), gateway
- [ ] Common standards: error envelope, `/healthz`, structured logging, env config
- [ ] Define **event contracts** (`quiz_completed`, `user_registered`) in `libs/contracts`
- [ ] RabbitMQ publish/consume helpers (Go + Node)

### Phase 1 — Auth Service (1 week)
- [ ] register/login/refresh/logout + JWT
- [ ] Centralized JWT verification at the gateway, forwarding `X-User-Id`
- [ ] Publish `user_registered`

### Phase 2 — Content Service (1.5 weeks)
- [ ] Course→Lesson→Vocab→Quiz→Question→Option schema (Prisma)
- [ ] Read API for the client + admin CRUD
- [ ] `POST /quizzes/:id/submit` grading + publish `quiz_completed`
- [ ] Seed sample data (1 English course, a few lessons + quizzes)

### Phase 3 — Progress & Leaderboard (1 week)
- [ ] Consume `quiz_completed` → XP + streak (Postgres) + Redis ZADD
- [ ] Consume `user_registered` → initialize progress
- [ ] `GET /progress/me`, `GET /leaderboard`

### Phase 4 — SRS Service (1.5 weeks)
- [ ] Implement & unit-test the SM-2 algorithm
- [ ] Consume `quiz_completed` → upsert `srs_cards`
- [ ] `GET /srs/due`, `POST /srs/answer`

### Phase 5 — Media Service (1 week)
- [ ] Integrate TTS provider + upload to R2 + caching
- [ ] `GET /media/audio` (redirect/stream) + batch preload

### Phase 6 — Finishing touches (1 week)
- [ ] DLQ + idempotency for consumers
- [ ] Rate limiting at the gateway, end-to-end integration test of the `quiz_completed` flow
- [ ] OpenAPI docs per service, README for running locally

---

## 5. Suggested build order
`Infra (P0)` → `Auth (P1)` → `Content (P2)` → `Progress (P3)` → `SRS (P4)` → `Media (P5)`.
Reason: Content is the central event publisher; only once Auth + Content exist can we test the `quiz_completed` flow for Progress & SRS. Media is independent — do it last or in parallel.

---

## 6. Open questions (to be decided)
1. **Real-time 1vs1** (vocabulary duel): if we build it → add a dedicated **ExpressJS + Socket.io** service (matchmaking + battle state via Redis Pub/Sub). This is the "playground" for the hard systems-engineering part.
2. **Should SRS use ExpressJS or NestJS?** This plan chooses **ExpressJS** (freedom to code the algorithm) per the suggestion; if you want standardized DI/validation, switch to NestJS.
3. Should Media return the **R2 URL directly** (cheap, good CDN caching) or **stream through the service** (more control)? We recommend redirecting to the URL.
4. Do we need a **BFF** that combines `home` (progress + courses) to reduce round-trips for mobile?
5. Is the TTS provider Google or Azure? (affects SDK + cost).
