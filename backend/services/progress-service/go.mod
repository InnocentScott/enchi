module github.com/tomovu/enchi/services/progress-service

go 1.23

// Stdlib-only ở bước scaffold. Khi build logic, thêm:
//   go get github.com/gofiber/fiber/v2
//   go get github.com/redis/go-redis/v9      (leaderboard — Sorted Sets)
//   go get github.com/jackc/pgx/v5
//   go get github.com/rabbitmq/amqp091-go     (consume quiz_completed, user_registered)
