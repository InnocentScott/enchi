---
name: express-typescript-practices
description: Best practices for the EnChi srs-service (ExpressJS + TypeScript) implementing the SM-2 spaced-repetition algorithm. Use whenever writing, reviewing, or debugging code under services/srs-service — covers layered structure, strict TypeScript, zod validation, async error handling, pg data access, pure-domain algorithm design, RabbitMQ consumers, and testing. Load this before touching any file in srs-service.
---

# Express + TypeScript Practices (EnChi srs-service)

Áp dụng cho `srs-service`: phần khó nhất về thuật toán (SM-2). Express cố tình mỏng để **logic thuật toán tự do & test kỹ**.

## Cấu trúc phân tầng
```
src/
├── index.ts                # bootstrap: middleware -> routes -> error handler -> listen
├── routes/                 # định nghĩa endpoint, gắn validate + controller
├── controllers/            # đọc req -> gọi service -> trả res (mỏng)
├── services/               # orchestration nghiệp vụ
├── srs/sm2.ts              # THUẬT TOÁN THUẦN — không import express/pg
├── store/                  # repository (pg)
└── events/                 # rabbitmq consumer
```
Phụ thuộc 1 chiều: `routes → controllers → services → store`. `srs/sm2.ts` là pure function, không phụ thuộc gì.

## TypeScript
- `strict: true`. Không `any`; dùng type/interface tường minh, `unknown` ở biên rồi narrow.
- Bật `noUncheckedIndexedAccess` nếu có thể. Không `// @ts-ignore`.

## Validation & error handling
- Validate input bằng **zod** ở ranh giới route (`schema.parse(req.body)`); fail → 400 error envelope.
- **Async error**: Express 4 không bắt lỗi async tự động. Dùng wrapper `asyncHandler(fn)` (hoặc `express-async-errors`) để mọi `throw` đi vào **error middleware tập trung** cuối chain.
- Error middleware (4 tham số) map lỗi → `{ code, message }` + status; lỗi không lường trước → 500, log full, **không** lộ stack cho client.

## Domain — SM-2 (`src/srs/sm2.ts`)
- Giữ **pure function** `review(state, quality)` (đã có sẵn). Không I/O, không Date.now bên trong — truyền `now` vào nếu cần tính `due_date` để test xác định.
- Mọi nhánh (q<3 reset, n=1→1d, n=2→6d, n≥3→round(I·EF), EF≥1.3) phải có **unit test** (`node --test`).

## Database (pg)
- `pg.Pool` 1 instance; query tham số hoá `$1` (chống SQLi). Migrations versioned. Bảng `srs_cards(user_id, vocab_id, ease_factor, interval_days, repetitions, due_date, last_reviewed)`.

## RabbitMQ
- Consumer `srs.quiz_completed`: với mỗi `result` trong event → tính `quality` → `review()` → upsert `srs_cards`. Manual ack, dedup theo `eventId`, lỗi → DLQ.

## Security & ops
- `helmet`, JSON body limit. Rate-limit để ở gateway. Đọc `X-User-Id` từ gateway, không tự verify JWT.
- Graceful shutdown: đóng `server`, `pool`, kênh RabbitMQ khi nhận SIGTERM.

## Anti-patterns (tránh)
- Logic trong controller; `async` route không bắt lỗi; nội suy chuỗi vào SQL; `Date.now()` trong hàm thuần; nuốt lỗi; trả stack trace cho client.
