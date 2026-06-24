---
name: nestjs-practices
description: Best practices for the EnChi content-service (NestJS + Prisma + TypeScript). Use whenever writing, reviewing, or debugging code under services/content-service — covers module structure, DTO validation, Prisma data access, config, guards/exception filters, RabbitMQ publishing, and testing. Load this before touching any file in content-service.
---

# NestJS Practices (EnChi content-service)

Áp dụng cho `content-service`: Course → Lesson → Vocabulary → Quiz → Question → Option (quan hệ sâu — lý do chọn Nest + Prisma).

## Module structure
- Một **feature module** mỗi domain: `CoursesModule`, `LessonsModule`, `QuizModule`, `PrismaModule`, `EventsModule`.
- Phân tầng: **Controller** (HTTP, mỏng) → **Service** (business logic) → **Repository/Prisma** (data). Controller không chứa logic; Prisma không gọi từ controller.
- DI qua constructor; tránh circular dependency (nếu kẹt, tách shared module — đừng dùng `forwardRef` bừa).

## DTO & validation
- Mọi input có **DTO class** + `class-validator` decorators (`@IsString`, `@IsUUID`, `@IsEnum`, `@ValidateNested`...).
- `ValidationPipe` global đã bật `whitelist: true, transform: true` (xem `main.ts`) → strip field thừa, ép kiểu. **Không** nhận `any`/`Body()` thô.
- Response: dùng DTO/serialization (`@Expose`/`ClassSerializerInterceptor`) để không lộ field nội bộ.

## Prisma
- `PrismaService extends PrismaClient` (1 instance, `onModuleInit` connect, `enableShutdownHooks`). Inject vào service, không `new PrismaClient()` rải rác.
- Tránh **N+1**: dùng `include`/`select` lấy đúng quan hệ cần trong 1 query. Chỉ `select` field cần thiết.
- Ghi nhiều bảng liên quan → `prisma.$transaction`.
- Schema thay đổi → `prisma migrate dev` (versioned trong `prisma/migrations`). Không `db push` lên data thật.
- Lỗi Prisma (`P2002` unique, `P2025` not found) → map sang HTTP đúng ở exception filter, không ném thẳng.

## Cross-cutting
- **Config**: `@nestjs/config` + validate env bằng schema (zod/Joi) lúc broot. Fail-fast nếu thiếu.
- **Exception filter** global → error envelope `{ code, message, details? }` khớp convention dự án.
- **Auth**: client đã được gateway verify; đọc `X-User-Id` qua một `@User()` param decorator + guard kiểm tra header tồn tại. Không tự verify JWT lại trong content-service.
- **Logging**: Nest `Logger`, đính context = tên class. Không log payload nhạy cảm.

## Nghiệp vụ trọng tâm — chấm quiz
- `POST /quizzes/:id/submit`: validate đáp án → chấm điểm trong **service thuần** (testable) → lưu submission (transaction) → **publish `quiz_completed`** (EventsService, payload khớp `libs/contracts`, có `eventId`+`submissionId`). Publish sau khi commit DB thành công.

## RabbitMQ
- `EventsModule` bọc `amqplib` (hoặc `@golevelup/nestjs-rabbitmq`). Publisher confirm; topic `learning.events`, routing key `quiz.completed`.

## Testing
- Unit: jest + mock service deps (logic chấm điểm test không cần DB). e2e: `@nestjs/testing` + test DB.

## Anti-patterns (tránh)
- Logic trong controller; gọi PrismaClient trực tiếp ngoài service; DTO thiếu validator; trả entity Prisma thô ra client; publish event trước khi commit; bắt rồi nuốt lỗi Prisma.
