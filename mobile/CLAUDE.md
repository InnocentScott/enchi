# EnChi Mobile — Rules

React Native + Expo (TypeScript). Đọc cùng `../CLAUDE.md`. Thiết kế: `../plan_frontend.md`.
**Trước khi sửa code, load skill `react-native-expo-practices`** (và `design-taste-frontend` khi làm UI/branding).

## Quy tắc bắt buộc
- **Server state → TanStack Query**; **client state → Zustand**. Không nhét dữ liệu backend vào Zustand.
- Mọi request qua `src/api/client.ts` (axios + JWT refresh) → API Gateway. Base URL = `EXPO_PUBLIC_API_URL`. Component không gọi axios trực tiếp.
- Token chỉ lưu `expo-secure-store`. Không log token/PII.
- TS `strict`, không `any`. Form dùng `react-hook-form` + `zod` (mirror DTO backend).
- Sau `submitQuiz`: invalidate `['progress','me']`, `['srs','due']`, `['leaderboard']`.

## Tích hợp backend (qua gateway)
| Màn | Endpoint |
|---|---|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh` |
| Courses/Lesson | `GET /courses`, `/lessons/:id` (+ `/media/audio`) |
| Quiz | `GET /quizzes/:lessonId`, `POST /quizzes/:id/submit` |
| Review (SRS) | `GET /srs/due`, `POST /srs/answer` |
| Progress/Leaderboard | `GET /progress/me`, `/leaderboard` |

## Setup
`npx create-expo-app@latest . --template blank-typescript` rồi cài deps (xem `README.md`). Giữ lại `src/api/client.ts`.
