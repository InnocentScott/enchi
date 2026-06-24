# 🛠️ Plan Backend — App Học Ngôn Ngữ (Polyglot Microservices)

> Bám theo `implementation_plan_learning_app.md`: **Dễ → Golang, Tầm trung → NestJS, Khó → ExpressJS**.
> Giao tiếp: **REST** (client → service) + **RabbitMQ** (event bất đồng bộ giữa các service).
> Hạ tầng dùng chung: **PostgreSQL + Redis + RabbitMQ** qua `docker-compose`.

---

## 0. Quyết định kiến trúc nền tảng (làm trước tiên)

- **API Gateway / BFF:** Mobile app chỉ nên biết **1 entrypoint**. Đề xuất **Traefik** hoặc **Nginx** reverse-proxy định tuyến theo path (`/auth`, `/content`, `/progress`, `/srs`, `/media`). Gateway xử lý: TLS, rate-limit, và **xác thực JWT tập trung** (forward `X-User-Id` xuống service).
- **Database per service** (đúng tinh thần microservices): mỗi service một schema/DB Postgres riêng, **không** share bảng. Liên kết dữ liệu qua ID + event, không qua JOIN xuyên service.
- **Chuẩn chung:** mọi service expose `/healthz`, log có `request_id`, error envelope thống nhất `{ code, message, details }`.
- **Auth contract:** access token (JWT, ngắn hạn ~15m) + refresh token (dài hạn, lưu DB/Redis để revoke).

---

## 1. Chi tiết từng Service

### 🟢 Auth & User Service — Golang (Dễ)
- **Framework:** Fiber hoặc Gin; **sqlc** hoặc GORM; **bcrypt**; **golang-jwt**.
- **DB (Postgres `auth_db`):** `users(id, email, password_hash, display_name, created_at)`, `refresh_tokens(id, user_id, token_hash, expires_at, revoked)`.
- **Endpoints:**
  - `POST /auth/register`, `POST /auth/login`
  - `POST /auth/refresh`, `POST /auth/logout`
  - `GET /users/me`, `PATCH /users/me`
- **Event phát:** `user_registered` (để service khác khởi tạo dữ liệu mặc định, vd. Progress tạo record XP=0).

### 🟢 Progress & Leaderboard Service — Golang (Dễ)
- **Framework:** Fiber/Gin; **Redis** (Sorted Sets cho leaderboard); Postgres cho dữ liệu bền.
- **DB (`progress_db`):** `user_progress(user_id, total_xp, current_streak, longest_streak, last_active_date)`, `xp_log(...)`.
- **Redis:** `ZADD leaderboard:global <xp> <user_id>` → query rank/top-N siêu nhanh.
- **Endpoints:**
  - `GET /progress/me`, `GET /progress/:userId`
  - `GET /leaderboard?scope=global&limit=50`
- **Event tiêu thụ:** `quiz_completed` → cộng XP, cập nhật streak, `ZADD` leaderboard.
- **Event tiêu thụ:** `user_registered` → tạo record progress mặc định.

### 🟢 Media Service (Text-to-Speech) — Golang (Dễ)
- **Framework:** Fiber/Gin; SDK **Google/Azure TTS**; **Cloudflare R2** (S3-compatible, dùng aws-sdk-go).
- **Luồng:** nhận `text + lang` → check cache (R2 key = hash) → nếu thiếu thì gọi TTS, nén, upload R2 → trả URL (hoặc stream).
- **DB/cache:** bảng `audio_cache(hash, lang, r2_key, created_at)` hoặc chỉ check tồn tại trên R2.
- **Endpoints:**
  - `GET /media/audio?text=...&lang=en` → 302 redirect tới R2 URL **hoặc** stream.
  - `POST /media/audio/batch` (preload cho 1 bài học).

### 🟡 Content Service — NestJS (Tầm trung)
- **Framework:** NestJS + **Prisma** (hoặc TypeORM); Postgres; **class-validator** cho DTO.
- **DB (`content_db`) — quan hệ sâu:**
  - `Course 1—n Lesson 1—n Vocabulary`
  - `Lesson 1—n Quiz`, `Quiz 1—n Question`, `Question 1—n Option` (multiple-choice / matching)
- **Endpoints:**
  - `GET /courses`, `GET /courses/:id`
  - `GET /lessons/:id` (kèm vocab)
  - `GET /quizzes/:lessonId`, `POST /quizzes/:id/submit`
  - CRUD admin cho nội dung (tách guard role admin)
- **Event phát:** `quiz_completed { userId, quizId, vocabIds[], correctMap }` sau khi chấm điểm → Progress & SRS cùng nhặt.

### 🔴 SRS Service (Spaced Repetition) — ExpressJS (Khó về thuật toán)
- **Framework:** ExpressJS + TypeScript (tự do code thuật toán **SM-2 / SuperMemo**); Postgres.
- **DB (`srs_db`):** `srs_cards(user_id, vocab_id, ease_factor, interval_days, repetitions, due_date, last_reviewed)`.
- **Thuật toán SM-2:** dựa vào chất lượng trả lời (0–5) → cập nhật `ease_factor`, `interval`, `due_date`.
- **Endpoints:**
  - `GET /srs/due?limit=20` → các từ cần ôn hôm nay
  - `POST /srs/answer { vocabId, quality }` → cập nhật lịch
- **Event tiêu thụ:** `quiz_completed` → tạo/cập nhật `srs_cards` cho các `vocabIds` (đúng/sai → quality).

---

## 2. RabbitMQ — Topology & Event Flow

- **Exchange:** `learning.events` (type `topic`).
- **Routing keys:** `quiz.completed`, `user.registered`.
- **Queues (mỗi consumer 1 queue, bind riêng):**
  - `progress.quiz_completed` ← `quiz.completed`
  - `srs.quiz_completed` ← `quiz.completed`
  - `progress.user_registered` ← `user.registered`
- **Đảm bảo:** dùng **manual ack**, **DLQ** (dead-letter) cho message lỗi, **idempotency key** (vd. `quizSubmissionId`) để consumer xử lý đúng-một-lần.

**Flow `quiz_completed`:**
```
Mobile → POST /quizzes/:id/submit (Content)
Content chấm điểm, lưu submission, publish quiz.completed
   ├─→ Progress: +XP, update streak, ZADD leaderboard
   └─→ SRS:      update srs_cards (due_date mới theo SM-2)
Mobile invalidate: progress/me, srs/due, leaderboard
```

---

## 3. Cấu trúc repo (backend)

> `enchi/` là umbrella chứa 2 repo: `backend/` (file này) và `mobile/` (xem `plan_frontend.md`).

```text
enchi/backend/
├── services/
│   ├── auth-service/        (Golang)
│   ├── progress-service/    (Golang)
│   ├── media-service/       (Golang)
│   ├── content-service/     (NestJS)
│   └── srs-service/         (ExpressJS)
├── libs/
│   ├── proto-or-contracts/  # JSON schema / OpenAPI cho event payloads dùng chung
│   └── go-shared/           # middleware JWT, logger, rabbitmq helper (Go)
├── gateway/                 # Traefik/Nginx config
└── docker-compose.yml       # Postgres + Redis + RabbitMQ + 5 services + gateway
```

---

## 4. Lộ trình triển khai (Phases)

### Phase 0 — Hạ tầng & khung (1 tuần)
- [ ] `docker-compose`: Postgres, Redis, RabbitMQ (+ management UI), gateway
- [ ] Chuẩn chung: error envelope, `/healthz`, structured logging, env config
- [ ] Định nghĩa **event contracts** (`quiz_completed`, `user_registered`) trong `libs/contracts`
- [ ] Helper RabbitMQ publish/consume (Go + Node)

### Phase 1 — Auth Service (1 tuần)
- [ ] register/login/refresh/logout + JWT
- [ ] Gateway xác thực JWT tập trung, forward `X-User-Id`
- [ ] Publish `user_registered`

### Phase 2 — Content Service (1.5 tuần)
- [ ] Schema Course→Lesson→Vocab→Quiz→Question→Option (Prisma)
- [ ] Read API cho client + CRUD admin
- [ ] `POST /quizzes/:id/submit` chấm điểm + publish `quiz_completed`
- [ ] Seed dữ liệu mẫu (1 khóa English, vài bài + quiz)

### Phase 3 — Progress & Leaderboard (1 tuần)
- [ ] Consume `quiz_completed` → XP + streak (Postgres) + Redis ZADD
- [ ] Consume `user_registered` → khởi tạo progress
- [ ] `GET /progress/me`, `GET /leaderboard`

### Phase 4 — SRS Service (1.5 tuần)
- [ ] Cài đặt & unit-test thuật toán SM-2
- [ ] Consume `quiz_completed` → upsert `srs_cards`
- [ ] `GET /srs/due`, `POST /srs/answer`

### Phase 5 — Media Service (1 tuần)
- [ ] Tích hợp TTS provider + upload R2 + cache
- [ ] `GET /media/audio` (redirect/stream) + batch preload

### Phase 6 — Hoàn thiện (1 tuần)
- [ ] DLQ + idempotency cho consumers
- [ ] Rate-limit ở gateway, integration test luồng `quiz_completed` end-to-end
- [ ] OpenAPI docs mỗi service, README chạy local

---

## 5. Thứ tự build đề xuất
`Infra (P0)` → `Auth (P1)` → `Content (P2)` → `Progress (P3)` → `SRS (P4)` → `Media (P5)`.
Lý do: Content phát event là trung tâm; có Auth + Content rồi mới test được flow `quiz_completed` cho Progress & SRS. Media độc lập, làm cuối hoặc song song.

---

## 6. Câu hỏi mở (cần chốt)
1. **Real-time 1vs1** (thách đấu từ vựng): nếu làm → thêm **ExpressJS + Socket.io** service riêng (matchmaking + battle state qua Redis Pub/Sub). Đây là "đất diễn" cho phần khó kỹ thuật hệ thống.
2. **SRS dùng ExpressJS hay NestJS?** Plan này chọn **ExpressJS** (tự do code thuật toán) đúng theo gợi ý; nếu muốn chuẩn hóa DI/validation thì chuyển NestJS.
3. Media trả **R2 URL trực tiếp** (rẻ, cache CDN tốt) hay **stream qua service** (kiểm soát hơn)? Đề xuất redirect URL.
4. Có cần **BFF** gộp `home` (progress + courses) để giảm round-trip cho mobile không?
5. TTS provider chốt Google hay Azure? (ảnh hưởng SDK + chi phí).
