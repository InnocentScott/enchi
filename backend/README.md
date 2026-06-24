# 🛠️ EnChi Backend — Polyglot Microservices

Backend cho app học ngôn ngữ EnChi. Kiến trúc & lý do: xem
[`../implementation_plan_learning_app.md`](../implementation_plan_learning_app.md),
[`../plan_backend.md`](../plan_backend.md).
Mobile client là repo riêng: [`../mobile`](../mobile).

## Cấu trúc

```text
backend/
├── docker-compose.yml      # Postgres + Redis + RabbitMQ + Traefik gateway + 5 services
├── infra/postgres/         # script tạo nhiều DB (auth/content/progress/srs)
├── gateway/traefik/        # cấu hình API gateway
├── libs/contracts/         # JSON Schema cho event payload dùng chung
└── services/
    ├── auth-service/       (Golang)   :8001  /auth /users
    ├── content-service/    (NestJS)   :8002  /courses /lessons /quizzes
    ├── progress-service/   (Golang)   :8003  /progress /leaderboard
    ├── srs-service/        (ExpressJS):8004  /srs
    └── media-service/      (Golang)   :8005  /media
```

## Chạy hạ tầng + services (cần Docker)

```bash
cp .env.example .env
docker compose up -d            # Postgres, Redis, RabbitMQ, Traefik, 5 services
docker compose ps
```

| Thành phần | URL / Port |
|---|---|
| API Gateway (Traefik) | http://localhost (định tuyến theo path) |
| Traefik dashboard | http://localhost:8080 |
| RabbitMQ management | http://localhost:15672 (guest/guest) |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

Mọi request client đi qua gateway: `http://localhost/auth/login`, `http://localhost/courses`, …

## Auth tập trung

Gateway dùng **ForwardAuth middleware** trỏ về `auth-service /auth/verify`. Route cần bảo vệ
sẽ được verify JWT, sau đó forward header `X-User-Id` xuống service đích. Route public
(`/auth/login`, `/auth/register`) bỏ qua middleware.

## Trạng thái scaffold

Đây là **bộ khung khởi tạo**. Mỗi service mới có `/healthz` + stub route (trả `501 Not Implemented`)
để lộ rõ API surface. Logic nghiệp vụ được build theo các phase trong `../plan_backend.md`.

| Việc cần làm khi bắt đầu code mỗi service | |
|---|---|
| Go services | `cd services/<svc> && go mod tidy` rồi thêm Fiber/Gin, sqlc/GORM |
| content-service | `cd services/content-service && npm install` (NestJS + Prisma) |
| srs-service | `cd services/srs-service && npm install` |
