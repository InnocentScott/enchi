# EnChi Mobile — Rules

React Native + Expo (TypeScript). Read alongside `../CLAUDE.md`. Design: `../plan_frontend.md`.
**Before modifying code, load the skill `react-native-expo-practices`** (and `design-taste-frontend` when working on UI/branding).

## Mandatory rules
- **Server state → TanStack Query**; **client state → Zustand**. Do not stuff backend data into Zustand.
- All requests go through `src/api/client.ts` (axios + JWT refresh) → API Gateway. Base URL = `EXPO_PUBLIC_API_URL`. Components do not call axios directly.
- Tokens are stored only in `expo-secure-store`. Do not log tokens/PII.
- TS `strict`, no `any`. Forms use `react-hook-form` + `zod` (mirror the backend DTOs).
- After `submitQuiz`: invalidate `['progress','me']`, `['srs','due']`, `['leaderboard']`.

## Backend integration (via the gateway)
| Screen | Endpoint |
|---|---|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh` |
| Courses/Lesson | `GET /courses`, `/lessons/:id` (+ `/media/audio`) |
| Quiz | `GET /quizzes/:lessonId`, `POST /quizzes/:id/submit` |
| Review (SRS) | `GET /srs/due`, `POST /srs/answer` |
| Progress/Leaderboard | `GET /progress/me`, `/leaderboard` |

## Setup
`npx create-expo-app@latest . --template blank-typescript` then install deps (see `README.md`). Keep `src/api/client.ts`.
