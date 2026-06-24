# Event Contracts

JSON Schema cho payload các event đi qua RabbitMQ (exchange `learning.events`, type `topic`).
Là **nguồn chân lý dùng chung** giữa producer và consumer — mọi service phải validate payload
theo các schema này.

| Event | Routing key | Producer | Consumers |
|---|---|---|---|
| `user_registered` | `user.registered` | auth-service | progress-service |
| `quiz_completed`   | `quiz.completed`  | content-service | progress-service, srs-service |

## Idempotency
Mỗi message mang `eventId` (uuid). Consumer phải lưu/đối chiếu `eventId` để xử lý **đúng-một-lần**
(quiz_completed thêm `submissionId` để dedup theo lần nộp bài).

## Queue bindings (mỗi consumer 1 queue riêng, có DLQ)
- `progress.user_registered` ← `user.registered`
- `progress.quiz_completed`  ← `quiz.completed`
- `srs.quiz_completed`       ← `quiz.completed`
