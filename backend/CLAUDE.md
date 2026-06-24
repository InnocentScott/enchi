# EnChi Backend — Rules

Polyglot microservices. Đọc cùng `../CLAUDE.md` (invariants + build order). Thiết kế: `../plan_backend.md`.

## Services & ports
| Service | Tech | Port | DB | Skill |
|---|---|---|---|---|
| auth-service | Go | 8001 | `auth_db` | `golang-backend-practices` |
| content-service | NestJS | 8002 | `content_db` | `nestjs-practices` |
| progress-service | Go | 8003 | `progress_db` + Redis | `golang-backend-practices` |
| srs-service | Express | 8004 | `srs_db` | `express-typescript-practices` |
| media-service | Go | 8005 | (R2, no PG) | `golang-backend-practices` |

> **Trước khi sửa một service, load skill ở cột phải.**

## Quy tắc bắt buộc
- **DB-per-service**, không JOIN/khoá ngoại xuyên service. Liên kết qua ID + event.
- Client không gọi thẳng service — luôn qua gateway (Traefik, port 80). Gateway verify JWT (ForwardAuth → `auth-service/auth/verify`) và set `X-User-Id`.
- Event qua RabbitMQ `learning.events` (topic). Payload **phải** validate theo `libs/contracts/events/*.schema.json`. Đính `eventId` (uuid) + `occurredAt`; consumer **idempotent** theo `eventId`.
- Secret qua `.env` (gitignored). Đọc qua config, fail-fast nếu thiếu.
- Mỗi service: `GET /healthz` + error envelope `{code,message}`.

## Event map
| Event | routing key | Producer | Consumers |
|---|---|---|---|
| `user_registered` | `user.registered` | auth | progress |
| `quiz_completed` | `quiz.completed` | content | progress, srs |

## Chạy / thêm dependency
- Toàn bộ: `cp .env.example .env && docker compose up -d` (cần Docker).
- Go service: `cd services/<svc> && go mod tidy` (scaffold đang stdlib-only).
- Node service: `cd services/<svc> && npm install`.
- Migration phải versioned (golang-migrate cho Go, Prisma cho content). Không tạo schema lúc runtime.
