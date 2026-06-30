# EnChi — Project Rules (umbrella)

**EnChi** (English + Chinese) — a language-learning app. This umbrella holds two independent repos:
`backend/` (polyglot microservices) and `mobile/` (React Native + Expo).
Design docs: `implementation_plan_learning_app.md`, `plan_backend.md`, `plan_frontend.md`.

## Architecture — INVARIANTS (must not be violated)

1. **Database-per-service.** Each service owns its own schema (`auth_db`, `content_db`, `progress_db`, `srs_db`). **NO** cross-service JOINs, **NO** shared tables. Link via ID + event.
2. **Clients only call through the API Gateway** (Traefik). Never call a service directly. The gateway verifies the JWT (ForwardAuth → `auth-service /auth/verify`) and forwards `X-User-Id`.
3. **Synchronous communication = REST**, asynchronous = **RabbitMQ** (exchange `learning.events`, topic). Event payloads must match the JSON Schemas in `backend/libs/contracts/`.
4. **Idempotency**: every consumer deduplicates by `eventId` (and `submissionId` for `quiz_completed`).
5. **Never commit secrets.** Use `.env` (gitignored); read config from env, fail-fast if missing.

## Build order (per plan_backend.md §5)
`Infra → Auth → Content → Progress → SRS → Media`; mobile proceeds in parallel once Auth + Content are ready.
Reason: Content emits `quiz_completed` (the central event); Auth + Content are needed before the Progress & SRS flows can be tested.

## Skill routing — which skill to load for what
| When working in… | Invoke skill |
|---|---|
| `services/auth-service`, `progress-service`, `media-service` (Go) | `golang-backend-practices` |
| `services/content-service` (NestJS) | `nestjs-practices` |
| `services/srs-service` (Express) | `express-typescript-practices` |
| `mobile/` (React Native + Expo) | `react-native-expo-practices` |
| Mobile UI/screens that need to look "polished" | `design-taste-frontend` |

> Before writing/changing code in an area, **read the matching skill and follow it**. The skill is the source of truth for conventions; this file only holds invariants + routing.

## Common conventions (all languages)
- Every service exposes `GET /healthz` → `{ status, service }`.
- Unified error envelope: `{ "code": "UPPER_SNAKE", "message": "...", "details"?: ... }`.
- Structured logging with a `request_id` attached. **Do not** log tokens/passwords/PII.
- Validate input at the boundary (DTO/zod/struct tags). Never trust client data.
- Small, well-named functions; match the surrounding style; comments explain "why", not "what".
- Conventional commits: `feat(auth): ...`, `fix(srs): ...`, `chore(infra): ...`.

## Definition of Done (each vertical slice)
- [ ] Code matches the relevant skill + the invariants above.
- [ ] `/healthz` green; new routes validate input and return the correct error envelope.
- [ ] Pure logic (e.g. SM-2) has unit tests.
- [ ] Event publish/consume matches the schema + is idempotent.
- [ ] The service README is updated if routes/env vars change.

---

## Current status & how to continue

**Status:** all five backend services (auth, content, progress, srs, media) are implemented and verified end-to-end through the gateway; the mobile app's core flows (auth → courses → lesson → quiz → review / leaderboard / profile) are built and type-checked. Active branch: **`init-source`**.

**How to run:** see [`README.md`](./README.md) (prerequisites + Windows/macOS install). In short: `docker compose -f backend/docker-compose.yml up -d --build`, seed content once (`cd backend/services/content-service && npm run seed`), then `cd mobile && npm install && npx expo start --clear` with `EXPO_PUBLIC_API_URL` pointing at the gateway.

**Key implementation decisions / gotchas** (so you don't re-derive or break them):
- **Gateway routing uses Traefik's file provider**, not Docker labels — `backend/gateway/traefik/dynamic/{routes.yml,middlewares.yml}`. (The Docker socket provider is unreliable on Docker Desktop / Windows.) To add a service to the gateway, add a router + service there; protected routers attach the `jwt-auth` middleware (ForwardAuth → auth `/auth/verify`).
- **Host ports are configurable** via `backend/.env` (`*_HOST_PORT`, e.g. `GATEWAY_HOST_PORT`); defaults are standard (gateway 80, etc.). `.env` is gitignored, so set it per machine.
- **content-service runs on `node:slim` (Debian)**, not Alpine — Prisma's engine needs OpenSSL. Containers run migrations on startup; **seeding is a manual step** (`npm run seed`), it does not run in the container.
- **Go services** use stdlib `net/http` + pgx + amqp091; migrations are embedded and applied on startup; idempotency via a `processed_events` table inside the same transaction as the state change.
- **JWTs include a `jti`** (random UUID) so two tokens minted in the same second differ — otherwise the refresh-token hash hits the unique constraint.
- **Mobile**: server state = TanStack Query, client/auth state = Zustand; all HTTP goes through `mobile/src/api/client.ts` (axios + JWT refresh). `EXPO_PUBLIC_API_URL` is inlined at bundle time — restart with `--clear` after changing it, and never use `localhost` from a device/emulator.

**What remains to polish** (not blocking): real TTS provider for `media` (currently a WAV stub behind a provider-agnostic interface) + Cloudflare R2 upload; enrich the SRS review screen with vocabulary text (needs a content endpoint to fetch vocab by ids); content-admin CRUD (currently seeded); MATCHING-type quiz scoring; UI polish/animations; i18n.
