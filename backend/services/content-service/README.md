# content-service (NestJS)

Courses, lessons, vocabulary, and quizzes — with deep data relationships (Prisma). **DB:** `content_db`. **Port:** 8002.

## Routes
| Method | Path | Notes |
|---|---|---|
| GET | /healthz | |
| GET | /courses, /courses/:id | |
| GET | /lessons/:id | includes vocabulary |
| GET | /quizzes/:lessonId | |
| POST | /quizzes/:id/submit | scores the quiz → **publishes `quiz_completed`** |

`GET /courses`, `/lessons/:id`, and `/quizzes/:lessonId` require JWT (the gateway attaches `jwt-auth` → forwards `X-User-Id`). `submit` scores the quiz in `quiz/scoring.ts` (pure, with unit tests), saves the `QuizSubmission`, then publishes `quiz_completed` (after the commit).

## Data model
See `prisma/schema.prisma`: Course → Lesson → Vocabulary; Lesson → Quiz → Question → Option; + `QuizSubmission`.

## Setup
```bash
npm install
# create/update the DB (requires CONTENT_DATABASE_URL pointing to Postgres)
npx prisma migrate dev --name init
npm run seed               # seed one sample English course (idempotent)
npm test                   # unit test scoring
npm run start:dev          # :8002
```
In Docker: the container automatically runs `prisma migrate deploy` on startup (see Dockerfile). **Seeding is a manual step** (run `npm run seed` once, pointing at the corresponding DB) — the seed does not run automatically in the container.

## Remaining (later)
Admin CRUD for content management (currently uses the seed). Support for MATCHING-type questions on submit (currently scored as MULTIPLE_CHOICE).
