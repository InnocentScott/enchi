---
name: nestjs-practices
description: Best practices for the EnChi content-service (NestJS + Prisma + TypeScript). Use whenever writing, reviewing, or debugging code under services/content-service — covers module structure, DTO validation, Prisma data access, config, guards/exception filters, RabbitMQ publishing, and testing. Load this before touching any file in content-service.
---

# NestJS Practices (EnChi content-service)

Applies to `content-service`: Course → Lesson → Vocabulary → Quiz → Question → Option (deeply nested relations — the reason Nest + Prisma were chosen).

## Module structure
- One **feature module** per domain: `CoursesModule`, `LessonsModule`, `QuizModule`, `PrismaModule`, `EventsModule`.
- Layering: **Controller** (HTTP, thin) → **Service** (business logic) → **Repository/Prisma** (data). The controller contains no logic; Prisma is never called from the controller.
- DI through the constructor; avoid circular dependencies (if stuck, extract a shared module — do not reach for `forwardRef` carelessly).

## DTO & validation
- Every input has a **DTO class** + `class-validator` decorators (`@IsString`, `@IsUUID`, `@IsEnum`, `@ValidateNested`, ...).
- The global `ValidationPipe` already has `whitelist: true, transform: true` enabled (see `main.ts`) → strips extra fields and coerces types. **Never** accept raw `any`/`Body()`.
- Response: use a DTO/serialization (`@Expose`/`ClassSerializerInterceptor`) so internal fields are not exposed.

## Prisma
- `PrismaService extends PrismaClient` (a single instance, connect in `onModuleInit`, `enableShutdownHooks`). Inject it into services; do not scatter `new PrismaClient()` calls.
- Avoid **N+1**: use `include`/`select` to fetch exactly the relations you need in a single query. Only `select` the fields you need.
- Writing to multiple related tables → `prisma.$transaction`.
- Schema change → `prisma migrate dev` (versioned in `prisma/migrations`). Do not `db push` to real data.
- Prisma errors (`P2002` unique, `P2025` not found) → map to the correct HTTP status in the exception filter; do not throw them straight through.

## Cross-cutting
- **Config**: `@nestjs/config` + validate env with a schema (zod/Joi) at boot. Fail-fast if anything is missing.
- **Exception filter** (global) → error envelope `{ code, message, details? }` matching the project convention.
- **Auth**: the client has already been verified by the gateway; read `X-User-Id` via a `@User()` param decorator + a guard that checks the header exists. Do not re-verify the JWT inside content-service.
- **Logging**: Nest `Logger`, with context set to the class name. Do not log sensitive payloads.

## Core business logic — quiz grading
- `POST /quizzes/:id/submit`: validate the answers → grade in a **pure service** (testable) → save the submission (in a transaction) → **publish `quiz_completed`** (EventsService, payload matching `libs/contracts`, with `eventId` + `submissionId`). Publish after the DB commit succeeds.

## RabbitMQ
- `EventsModule` wraps `amqplib` (or `@golevelup/nestjs-rabbitmq`). Publisher in confirm mode; topic `learning.events`, routing key `quiz.completed`.

## Testing
- Unit: jest + mocked service deps (grading logic is tested without a DB). e2e: `@nestjs/testing` + a test DB.

## Anti-patterns (avoid)
- Logic in the controller; calling PrismaClient directly outside a service; DTOs without validators; returning raw Prisma entities to the client; publishing an event before the commit; catching and then swallowing Prisma errors.
