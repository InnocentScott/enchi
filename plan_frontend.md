# 📱 Frontend Plan — Language Learning App (React Native)

> Following the architecture in `implementation_plan_learning_app.md`. The mobile app is the only client and communicates with the backend via **REST API** (through the API Gateway / BFF — see `plan_backend.md`).

---

## 1. Tech Stack

| Category | Choice | Reason |
|---|---|---|
| Framework | **React Native + Expo (managed)** + **TypeScript** | Fast build speed, OTA updates, built-in audio/asset support — a good fit for a learning app |
| Navigation | **React Navigation** (native-stack + bottom-tabs) | The de-facto standard |
| Server state | **TanStack Query** (React Query) | Caching, retries, and invalidation for lesson/quiz data |
| Client state | **Zustand** | Lightweight for auth state, UI state, and the quiz session |
| HTTP | **Axios** + interceptor attaching JWT & refresh token | Centralized API-call logic |
| Auth storage | **expo-secure-store** | Securely store the access/refresh tokens |
| Audio (TTS) | **expo-av** | Play audio files from the Media Service (Cloudflare R2) |
| Animation | **react-native-reanimated** + **moti** | XP bar, streak flame, confetti — gamification elements |
| Form & validation | **react-hook-form** + **zod** | Login/registration, mirroring the backend DTOs |
| i18n | **i18next** | Multilingual app (English/Chinese), separating out UI text |
| Lint/format | ESLint + Prettier + TypeScript strict | Code quality |

> If we later need a native module outside the Expo SDK (e.g. advanced background audio) → consider `expo prebuild` (bare workflow).

---

## 2. Directory structure (`enchi/mobile/`)

> `enchi/` is the umbrella containing 2 repos: `mobile/` (this file) and `backend/` (see `plan_backend.md`).

```text
enchi/mobile/
├── app/                    # if using expo-router; or src/navigation if plain React Navigation
├── src/
│   ├── api/                # axios client + 1 file per service: auth, content, progress, srs, media
│   │   ├── client.ts       # axios instance + interceptors (JWT, refresh, error)
│   │   └── endpoints/
│   ├── features/
│   │   ├── auth/           # login, register, splash, guard
│   │   ├── courses/        # course list → lessons
│   │   ├── lesson/         # vocabulary learning screen + audio playback
│   │   ├── quiz/           # multiple-choice, matching; submit results
│   │   ├── review/         # SRS — "Review Today"
│   │   ├── progress/       # XP, streak, profile
│   │   └── leaderboard/    # leaderboard
│   ├── components/         # reusable UI (Button, Card, ProgressBar, AudioButton)
│   ├── store/              # zustand stores (authStore, sessionStore)
│   ├── hooks/              # useAuth, useAudioPlayer, useReviewQueue
│   ├── lib/                # query client, theme, constants
│   └── i18n/
├── assets/
├── app.json
└── package.json
```

---

## 3. Screen ↔ Backend service map

| Screen | Service called | Endpoint (planned) |
|---|---|---|
| Splash / Auth guard | Auth | `POST /auth/refresh` |
| Register / Login | Auth | `POST /auth/register`, `POST /auth/login` |
| Home / Profile | Progress | `GET /progress/me` (XP, streak) |
| Course list | Content | `GET /courses` |
| Lesson detail (vocabulary) | Content + Media | `GET /lessons/:id`, `GET /media/audio?text=` |
| Take Quiz | Content | `GET /quizzes/:lessonId`, `POST /quizzes/:id/submit` |
| Review Today (SRS) | SRS | `GET /srs/due`, `POST /srs/answer` |
| Leaderboard | Progress | `GET /leaderboard?scope=global` |

> After `POST /quizzes/:id/submit`, the backend fires a `quiz_completed` event over RabbitMQ → Progress adds XP, SRS updates the review schedule. The FE just needs to **invalidate** the `progress/me`, `srs/due`, and `leaderboard` queries to refetch.

---

## 4. Technical issues to handle

- **JWT refresh flow:** short-lived access token + refresh token; the axios interceptor automatically refreshes on a 401 and queues the pending requests.
- **Audio caching:** cache TTS files by `text+lang` (expo-file-system) to avoid calling the Media Service again; preload a lesson's audio when it opens.
- **Offline-first for Review:** prefetch the SRS `due` queue when the app opens; allow answering offline and syncing later (optimistic + retry queue) — depending on the phase.
- **Optimistic UI:** when submitting a quiz/answer, update XP & streak immediately and reconcile when the server responds.
- **Gamification:** XP progress bar, streak flame, "level up" animation, confetti on completion — using reanimated.

---

## 5. Implementation roadmap (Phases)

### Phase 0 — Bootstrap (0.5 week)
- [ ] Init Expo + TypeScript strict, ESLint/Prettier
- [ ] Configure React Navigation (stack + tabs), theme, i18n skeleton
- [ ] Axios client + TanStack Query provider + Zustand auth store
- [ ] Mock API layer (MSW or json stub) so the FE can run independently of the BE

### Phase 1 — Auth (1 week)
- [ ] Splash screen + auth guard (token check)
- [ ] Register / Login (react-hook-form + zod)
- [ ] Store tokens (secure-store), refresh interceptor
- [ ] Basic profile

### Phase 2 — Content & Lesson (1.5 weeks)
- [ ] Course list → lessons
- [ ] Vocabulary learning screen + audio play button (expo-av) + caching
- [ ] Reusable components (Card, AudioButton, ProgressBar)

### Phase 3 — Quiz (1 week)
- [ ] Multiple-choice + matching quizzes
- [ ] Submit results, results screen, optimistic XP
- [ ] Invalidate progress/srs/leaderboard after submit

### Phase 4 — Progress, SRS Review, Leaderboard (1.5 weeks)
- [ ] Home displaying XP + streak
- [ ] "Review Today" screen (SRS due → answer)
- [ ] Leaderboard (global, with a possible friends tab)
- [ ] Gamification animations

### Phase 5 — Polish & Release (1 week)
- [ ] Loading/empty/error states, skeletons
- [ ] Offline review queue (if we choose to build it)
- [ ] Push notification reminders to review (expo-notifications) — *depends on a backend decision*
- [ ] EAS Build (Android first), test on a real device

---

## 6. Open questions (to be settled with the backend)
1. **Real-time** (1vs1 vocabulary duel) — if included, the FE needs to add a **Socket.io client** + matchmaking/battle screens. This is a large feature, so it should be split into its own phase.
2. JWT format & lifecycle (access/refresh lifetimes) to match the interceptor.
3. Does the Media Service return the R2 URL directly or stream through the gateway? This affects how audio is cached.
4. Do we need a BFF (Backend-for-Frontend) that combines the `home` call (progress + courses) into a single request, to reduce the number of round-trips when the app opens?
