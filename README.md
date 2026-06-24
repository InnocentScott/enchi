# 🐼 EnChi — App Học Ngôn Ngữ (English + Chinese)

**EnChi** (ghép từ **En**glish + **Chi**nese) là umbrella chứa 2 repo của dự án:

| Repo | Mô tả | Tech |
|---|---|---|
| [`backend/`](./backend) | Polyglot microservices (5 service + gateway + infra) | Golang · NestJS · ExpressJS · Postgres · Redis · RabbitMQ |
| [`mobile/`](./mobile) | App mobile (client duy nhất) | React Native + Expo |

> Mỗi folder là một **repo độc lập** (có thể `git init` riêng). Folder `enchi/` này chỉ là nơi
> gom 2 repo lại cho tiện làm việc cùng lúc.

## Tài liệu thiết kế (dùng chung)

- [`implementation_plan_learning_app.md`](./implementation_plan_learning_app.md) — kiến trúc tổng & lý do chọn tech.
- [`plan_backend.md`](./plan_backend.md) — kế hoạch chi tiết backend (services, event, phases).
- [`plan_frontend.md`](./plan_frontend.md) — kế hoạch chi tiết mobile (màn hình, state, phases).

## Bắt đầu

```bash
# Backend (cần Docker + Go 1.23)
cd backend && cp .env.example .env && docker compose up -d

# Mobile (cần Node + Expo)
cd mobile && npx create-expo-app@latest . --template blank-typescript   # xem mobile/README.md
```
