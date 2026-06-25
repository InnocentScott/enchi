package events

import (
	"context"
	"encoding/json"
	"log/slog"

	amqp "github.com/rabbitmq/amqp091-go"

	"github.com/tomovu/enchi/services/progress-service/internal/service"
)

const exchange = "learning.events"

type Consumer struct {
	conn *amqp.Connection
	ch   *amqp.Channel
	svc  *service.Service
	log  *slog.Logger
}

func NewConsumer(url string, svc *service.Service, log *slog.Logger) (*Consumer, error) {
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, err
	}
	ch, err := conn.Channel()
	if err != nil {
		_ = conn.Close()
		return nil, err
	}
	if err := ch.ExchangeDeclare(exchange, "topic", true, false, false, false, nil); err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return nil, err
	}
	return &Consumer{conn: conn, ch: ch, svc: svc, log: log}, nil
}

type userRegistered struct {
	EventID     string `json:"eventId"`
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
}

type quizCompleted struct {
	EventID string `json:"eventId"`
	UserID  string `json:"userId"`
	Score   int    `json:"score"`
}

// Start khai báo queue + bind + consume, chạy tới khi ctx hủy.
func (c *Consumer) Start(ctx context.Context) error {
	if err := c.bind("progress.user_registered", "user.registered"); err != nil {
		return err
	}
	if err := c.bind("progress.quiz_completed", "quiz.completed"); err != nil {
		return err
	}
	if err := c.ch.Qos(10, 0, false); err != nil {
		return err
	}

	regCh, err := c.ch.Consume("progress.user_registered", "", false, false, false, false, nil)
	if err != nil {
		return err
	}
	quizCh, err := c.ch.Consume("progress.quiz_completed", "", false, false, false, false, nil)
	if err != nil {
		return err
	}

	c.log.Info("consuming events")
	for {
		select {
		case <-ctx.Done():
			return nil
		case d, ok := <-regCh:
			if !ok {
				return nil
			}
			c.handleReg(ctx, d)
		case d, ok := <-quizCh:
			if !ok {
				return nil
			}
			c.handleQuiz(ctx, d)
		}
	}
}

func (c *Consumer) bind(queue, key string) error {
	if _, err := c.ch.QueueDeclare(queue, true, false, false, false, nil); err != nil {
		return err
	}
	return c.ch.QueueBind(queue, key, exchange, false, nil)
}

func (c *Consumer) handleReg(ctx context.Context, d amqp.Delivery) {
	var e userRegistered
	if err := json.Unmarshal(d.Body, &e); err != nil {
		c.log.Error("bad user_registered payload", "err", err)
		_ = d.Ack(false) // payload hỏng: drop (requeue không giúp)
		return
	}
	if err := c.svc.HandleUserRegistered(ctx, e.EventID, e.UserID, e.DisplayName); err != nil {
		c.log.Error("handle user_registered", "err", err, "event_id", e.EventID)
		_ = d.Nack(false, true) // lỗi tạm thời: requeue (dedup đảm bảo an toàn)
		return
	}
	_ = d.Ack(false)
}

func (c *Consumer) handleQuiz(ctx context.Context, d amqp.Delivery) {
	var e quizCompleted
	if err := json.Unmarshal(d.Body, &e); err != nil {
		c.log.Error("bad quiz_completed payload", "err", err)
		_ = d.Ack(false)
		return
	}
	if err := c.svc.HandleQuizCompleted(ctx, e.EventID, e.UserID, e.Score); err != nil {
		c.log.Error("handle quiz_completed", "err", err, "event_id", e.EventID)
		_ = d.Nack(false, true)
		return
	}
	_ = d.Ack(false)
}

func (c *Consumer) Close() {
	if c.ch != nil {
		_ = c.ch.Close()
	}
	if c.conn != nil {
		_ = c.conn.Close()
	}
}
