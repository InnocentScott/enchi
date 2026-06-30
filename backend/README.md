# 🛠️ EnChi Backend — Polyglot Microservices

Backend for the EnChi language-learning app. Architecture & rationale: see
[`../implementation_plan_learning_app.md`](../implementation_plan_learning_app.md),
[`../plan_backend.md`](../plan_backend.md).
The mobile client is a separate repo: [`../mobile`](../mobile).

## Structure

```text
backend/
├── docker-compose.yml      # Postgres + Redis + RabbitMQ + Traefik gateway + 5 services
├── infra/postgres/         # script that creates multiple DBs (auth/content/progress/srs)
├── gateway/traefik/        # API gateway configuration
├── libs/contracts/         # shared JSON Schema for event payloads
└── services/
    ├── auth-service/       (Golang)   :8001  /auth /users
    ├── content-service/    (NestJS)   :8002  /courses /lessons /quizzes
    ├── progress-service/   (Golang)   :8003  /progress /leaderboard
    ├── srs-service/        (ExpressJS):8004  /srs
    └── media-service/      (Golang)   :8005  /media
```

## Run the infrastructure + services (requires Docker)

```bash
cp .env.example .env
docker compose up -d            # Postgres, Redis, RabbitMQ, Traefik, 5 services
docker compose ps
```

| Component | URL / Port |
|---|---|
| API Gateway (Traefik) | http://localhost (routes by path) |
| Traefik dashboard | http://localhost:8080 |
| RabbitMQ management | http://localhost:15672 (guest/guest) |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

Every client request goes through the gateway: `http://localhost/auth/login`, `http://localhost/courses`, …

## Centralized auth

The gateway uses a **ForwardAuth middleware** pointing at `auth-service /auth/verify`. Protected routes
have their JWT verified, after which the `X-User-Id` header is forwarded to the target service. Public routes
(`/auth/login`, `/auth/register`) skip the middleware.

## Scaffold status

This is an **initial skeleton**. Each new service has `/healthz` + stub routes (returning `501 Not Implemented`)
to expose the API surface clearly. Business logic is built out in the phases described in `../plan_backend.md`.

| What to do when you start coding each service | |
|---|---|
| Go services | `cd services/<svc> && go mod tidy`, then add Fiber/Gin, sqlc/GORM |
| content-service | `cd services/content-service && npm install` (NestJS + Prisma) |
| srs-service | `cd services/srs-service && npm install` |
