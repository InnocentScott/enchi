# content-service (NestJS)

Khóa học, bài học, từ vựng, quiz — quan hệ dữ liệu sâu (Prisma). **DB:** `content_db`. **Port:** 8002.

## Routes
| Method | Path | Ghi chú |
|---|---|---|
| GET | /healthz | |
| GET | /courses, /courses/:id | |
| GET | /lessons/:id | kèm vocabulary |
| GET | /quizzes/:lessonId | |
| POST | /quizzes/:id/submit | chấm điểm → **publish `quiz_completed`** |

## Data model
Xem `prisma/schema.prisma`: Course → Lesson → Vocabulary; Lesson → Quiz → Question → Option.

## Setup (Phase 2)
```bash
npm install
npx prisma migrate dev --name init
npm run start:dev          # :8002
```
TODO: PrismaModule, CRUD admin (guard role), publisher RabbitMQ cho `quiz_completed`.
