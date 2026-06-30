# EnChi Backend — Rules

Polyglot microservices. Read alongside `../CLAUDE.md` (invariants + build order). Design: `../plan_backend.md`.

## Services & ports
| Service | Tech | Port | DB | Skill |
|---|---|---|---|---|
| auth-service | Go | 8001 | `auth_db` | `golang-backend-practices` |
| content-service | NestJS | 8002 | `content_db` | `nestjs-practices` |
| progress-service | Go | 8003 | `progress_db` + Redis | `golang-backend-practices` |
| srs-service | Express | 8004 | `srs_db` | `express-typescript-practices` |
| media-service | Go | 8005 | (R2, no PG) | `golang-backend-practices` |

> **Before modifying a service, load the skill in the right-hand column.**

## Mandatory rules
- **DB-per-service**, no cross-service JOINs or foreign keys. Link via ID + event.
- Clients never call a service directly — always go through the gateway (Traefik, port 80). The gateway verifies the JWT (ForwardAuth → `auth-service/auth/verify`) and sets `X-User-Id`.
- Events go through RabbitMQ `learning.events` (topic). Payloads **must** validate against `libs/contracts/events/*.schema.json`. Attach `eventId` (uuid) + `occurredAt`; consumers are **idempotent** on `eventId`.
- Secrets via `.env` (gitignored). Read through config, fail-fast if missing.
- Every service: `GET /healthz` + error envelope `{code,message}`.

## Event map
| Event | routing key | Producer | Consumers |
|---|---|---|---|
| `user_registered` | `user.registered` | auth | progress |
| `quiz_completed` | `quiz.completed` | content | progress, srs |

## Running / adding a dependency
- Everything: `cp .env.example .env && docker compose up -d` (requires Docker).
- Go service: `cd services/<svc> && go mod tidy` (the scaffold is currently stdlib-only).
- Node service: `cd services/<svc> && npm install`.
- Migrations must be versioned (golang-migrate for Go, Prisma for content). Do not create schemas at runtime.
