# EnChi — Project Rules (umbrella)

**EnChi** (English + Chinese) — app học ngôn ngữ. Umbrella chứa 2 repo độc lập:
`backend/` (polyglot microservices) và `mobile/` (React Native + Expo).
Thiết kế: `implementation_plan_learning_app.md`, `plan_backend.md`, `plan_frontend.md`.

## Kiến trúc — INVARIANTS (không được vi phạm)

1. **Database-per-service.** Mỗi service sở hữu schema riêng (`auth_db`, `content_db`, `progress_db`, `srs_db`). **KHÔNG** JOIN xuyên service, **KHÔNG** dùng chung bảng. Liên kết qua ID + event.
2. **Client chỉ gọi qua API Gateway** (Traefik). Không gọi thẳng service. Gateway verify JWT (ForwardAuth → `auth-service /auth/verify`) và forward `X-User-Id`.
3. **Giao tiếp đồng bộ = REST**, bất đồng bộ = **RabbitMQ** (exchange `learning.events`, topic). Event payload phải khớp JSON Schema ở `backend/libs/contracts/`.
4. **Idempotency**: mọi consumer dedup theo `eventId` (và `submissionId` cho `quiz_completed`).
5. **Không bao giờ commit secret.** Dùng `.env` (đã gitignore); code đọc qua env, fail-fast nếu thiếu.

## Build order (theo plan_backend.md §5)
`Infra → Auth → Content → Progress → SRS → Media`, mobile chạy song song sau khi Auth + Content sẵn sàng.
Lý do: Content phát `quiz_completed` (trung tâm); cần Auth + Content mới test được luồng cho Progress & SRS.

## Skill routing — load skill nào khi làm gì
| Đang làm việc ở… | Invoke skill |
|---|---|
| `services/auth-service`, `progress-service`, `media-service` (Go) | `golang-backend-practices` |
| `services/content-service` (NestJS) | `nestjs-practices` |
| `services/srs-service` (Express) | `express-typescript-practices` |
| `mobile/` (React Native + Expo) | `react-native-expo-practices` |
| UI/màn hình mobile cần "đẹp" | `design-taste-frontend` |

> Trước khi viết/sửa code trong một khu vực, **đọc skill tương ứng và tuân theo nó**. Skill là nguồn chân lý về convention; file này chỉ là invariant + routing.

## Convention chung (mọi ngôn ngữ)
- Mỗi service expose `GET /healthz` → `{ status, service }`.
- Error envelope thống nhất: `{ "code": "UPPER_SNAKE", "message": "...", "details"?: ... }`.
- Log có cấu trúc, đính `request_id`. **Không** log token/password/PII.
- Validate input ở biên (DTO/zod/struct tag). Không tin dữ liệu client.
- Hàm nhỏ, tên rõ; viết code khớp style xung quanh; comment "tại sao", không "cái gì".
- Conventional commits: `feat(auth): ...`, `fix(srs): ...`, `chore(infra): ...`.

## Definition of Done (mỗi vertical slice)
- [ ] Code khớp skill tương ứng + invariants ở trên.
- [ ] `/healthz` xanh; route mới validate input + trả error envelope đúng.
- [ ] Logic thuần (vd. SM-2) có unit test.
- [ ] Event publish/consume khớp schema + idempotent.
- [ ] README service cập nhật nếu đổi route/biến môi trường.
