# 📱 Plan Frontend — App Học Ngôn Ngữ (React Native)

> Bám theo kiến trúc trong `implementation_plan_learning_app.md`. App mobile là client duy nhất, giao tiếp với backend qua **REST API** (đi qua API Gateway / BFF — xem `plan_backend.md`).

---

## 1. Tech Stack

| Hạng mục | Lựa chọn | Lý do |
|---|---|---|
| Framework | **React Native + Expo (managed)** + **TypeScript** | Tốc độ build nhanh, OTA update, hỗ trợ audio/asset sẵn — hợp app học tập |
| Navigation | **React Navigation** (native-stack + bottom-tabs) | Tiêu chuẩn de-facto |
| Server state | **TanStack Query** (React Query) | Cache, retry, invalidation cho dữ liệu bài học/quiz |
| Client state | **Zustand** | Nhẹ cho auth state, UI state, session làm bài |
| HTTP | **Axios** + interceptor đính JWT & refresh token | Tập trung logic gọi API |
| Auth storage | **expo-secure-store** | Lưu access/refresh token an toàn |
| Audio (TTS) | **expo-av** | Phát file audio từ Media Service (Cloudflare R2) |
| Animation | **react-native-reanimated** + **moti** | XP bar, streak flame, confetti — yếu tố gamification |
| Form & validate | **react-hook-form** + **zod** | Đăng nhập/đăng ký, mirror DTO của backend |
| i18n | **i18next** | App đa ngôn ngữ (Anh/Trung), tách UI text |
| Lint/format | ESLint + Prettier + TypeScript strict | Chất lượng code |

> Nếu sau này cần native module ngoài Expo SDK (vd. background audio nâng cao) → cân nhắc `expo prebuild` (bare workflow).

---

## 2. Cấu trúc thư mục (`enchi/mobile/`)

> `enchi/` là umbrella chứa 2 repo: `mobile/` (file này) và `backend/` (xem `plan_backend.md`).

```text
enchi/mobile/
├── app/                    # nếu dùng expo-router; hoặc src/navigation nếu React Navigation thuần
├── src/
│   ├── api/                # axios client + 1 file/service: auth, content, progress, srs, media
│   │   ├── client.ts       # axios instance + interceptors (JWT, refresh, error)
│   │   └── endpoints/
│   ├── features/
│   │   ├── auth/           # login, register, splash, guard
│   │   ├── courses/        # danh sách khóa học → bài học
│   │   ├── lesson/         # màn học từ vựng + phát audio
│   │   ├── quiz/           # multiple-choice, matching; nộp kết quả
│   │   ├── review/         # SRS — "Ôn tập hôm nay"
│   │   ├── progress/       # XP, streak, profile
│   │   └── leaderboard/    # bảng xếp hạng
│   ├── components/         # UI tái sử dụng (Button, Card, ProgressBar, AudioButton)
│   ├── store/              # zustand stores (authStore, sessionStore)
│   ├── hooks/              # useAuth, useAudioPlayer, useReviewQueue
│   ├── lib/                # query client, theme, constants
│   └── i18n/
├── assets/
├── app.json
└── package.json
```

---

## 3. Bản đồ màn hình ↔ Backend service

| Màn hình | Service gọi tới | Endpoint (dự kiến) |
|---|---|---|
| Splash / Auth guard | Auth | `POST /auth/refresh` |
| Đăng ký / Đăng nhập | Auth | `POST /auth/register`, `POST /auth/login` |
| Home / Profile | Progress | `GET /progress/me` (XP, streak) |
| Danh sách khóa học | Content | `GET /courses` |
| Chi tiết bài học (từ vựng) | Content + Media | `GET /lessons/:id`, `GET /media/audio?text=` |
| Làm Quiz | Content | `GET /quizzes/:lessonId`, `POST /quizzes/:id/submit` |
| Ôn tập hôm nay (SRS) | SRS | `GET /srs/due`, `POST /srs/answer` |
| Leaderboard | Progress | `GET /leaderboard?scope=global` |

> Sau khi `POST /quizzes/:id/submit`, backend bắn event `quiz_completed` qua RabbitMQ → Progress cộng XP, SRS cập nhật lịch ôn. FE chỉ cần **invalidate** các query `progress/me`, `srs/due`, `leaderboard` để refetch.

---

## 4. Các vấn đề kỹ thuật cần xử lý

- **JWT refresh flow:** access token ngắn hạn + refresh token; axios interceptor tự refresh khi 401, queue request đang chờ.
- **Audio caching:** cache file TTS theo `text+lang` (expo-file-system) để không gọi lại Media Service; preload audio của bài học khi mở.
- **Offline-first cho Review:** prefetch hàng đợi SRS `due` lúc mở app; cho phép trả lời offline rồi sync (optimistic + retry queue) — tùy phase.
- **Optimistic UI:** khi submit quiz/answer, cập nhật XP & streak ngay, reconcile khi server trả về.
- **Gamification:** XP progress bar, streak flame, animation "lên level", confetti khi hoàn thành — dùng reanimated.

---

## 5. Lộ trình triển khai (Phases)

### Phase 0 — Khởi tạo (0.5 tuần)
- [ ] Init Expo + TypeScript strict, ESLint/Prettier
- [ ] Cấu hình React Navigation (stack + tabs), theme, i18n skeleton
- [ ] Axios client + TanStack Query provider + Zustand auth store
- [ ] Mock API layer (MSW hoặc json stub) để FE chạy độc lập với BE

### Phase 1 — Auth (1 tuần)
- [ ] Màn Splash + auth guard (kiểm tra token)
- [ ] Đăng ký / Đăng nhập (react-hook-form + zod)
- [ ] Lưu token (secure-store), interceptor refresh
- [ ] Profile cơ bản

### Phase 2 — Content & Lesson (1.5 tuần)
- [ ] Danh sách khóa học → bài học
- [ ] Màn học từ vựng + nút phát audio (expo-av) + caching
- [ ] Component tái sử dụng (Card, AudioButton, ProgressBar)

### Phase 3 — Quiz (1 tuần)
- [ ] Quiz multiple-choice + matching
- [ ] Submit kết quả, màn kết quả, optimistic XP
- [ ] Invalidate progress/srs/leaderboard sau submit

### Phase 4 — Progress, SRS Review, Leaderboard (1.5 tuần)
- [ ] Home hiển thị XP + streak
- [ ] Màn "Ôn tập hôm nay" (SRS due → answer)
- [ ] Leaderboard (global, có thể thêm tab bạn bè)
- [ ] Animation gamification

### Phase 5 — Polish & Release (1 tuần)
- [ ] Loading/empty/error states, skeleton
- [ ] Offline review queue (nếu chọn làm)
- [ ] Push notification nhắc ôn tập (expo-notifications) — *phụ thuộc quyết định backend*
- [ ] EAS Build (Android trước), test trên thiết bị thật

---

## 6. Câu hỏi mở (cần chốt với backend)
1. **Real-time** (thách đấu từ vựng 1vs1) — nếu có, FE cần thêm **Socket.io client** + màn matchmaking/battle. Đây là tính năng lớn, nên tách riêng phase.
2. Định dạng & lifecycle JWT (thời hạn access/refresh) để khớp interceptor.
3. Media Service trả về URL R2 trực tiếp hay stream qua gateway? Ảnh hưởng cách cache audio.
4. Có cần BFF (Backend-for-Frontend) gộp call `home` (progress + courses) thành 1 request không, để giảm số round-trip lúc mở app?
