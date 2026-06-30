# Event Contracts

JSON Schema for the payloads of events flowing through RabbitMQ (exchange `learning.events`, type `topic`).
This is the **shared source of truth** between producers and consumers — every service must validate payloads
against these schemas.

| Event | Routing key | Producer | Consumers |
|---|---|---|---|
| `user_registered` | `user.registered` | auth-service | progress-service |
| `quiz_completed`   | `quiz.completed`  | content-service | progress-service, srs-service |

## Idempotency
Each message carries an `eventId` (uuid). Consumers must store/check the `eventId` to process **exactly once**
(quiz_completed additionally includes `submissionId` to dedup by submission).

## Queue bindings (one dedicated queue per consumer, each with a DLQ)
- `progress.user_registered` ← `user.registered`
- `progress.quiz_completed`  ← `quiz.completed`
- `srs.quiz_completed`       ← `quiz.completed`
