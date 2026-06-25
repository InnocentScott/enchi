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

`GET /courses`, `/lessons/:id`, `/quizzes/:lessonId` cần JWT (gateway gắn `jwt-auth` → forward `X-User-Id`). `submit` chấm điểm trong `quiz/scoring.ts` (pure, có unit test), lưu `QuizSubmission`, rồi publish `quiz_completed` (sau khi commit).

## Data model
Xem `prisma/schema.prisma`: Course → Lesson → Vocabulary; Lesson → Quiz → Question → Option; + `QuizSubmission`.

## Setup
```bash
npm install
# tạo/cập nhật DB (cần CONTENT_DATABASE_URL trỏ tới Postgres)
npx prisma migrate dev --name init
npm run seed               # seed 1 khóa English mẫu (idempotent)
npm test                   # unit test scoring
npm run start:dev          # :8002
```
Trong Docker: container tự chạy `prisma migrate deploy` lúc khởi động (xem Dockerfile). **Seed là bước thủ công** (chạy `npm run seed` một lần trỏ vào DB tương ứng) — seed không tự chạy trong container.

## Còn lại (sau)
CRUD admin để quản trị nội dung (hiện dùng seed). Hỗ trợ câu hỏi dạng MATCHING khi submit (hiện chấm theo MULTIPLE_CHOICE).
