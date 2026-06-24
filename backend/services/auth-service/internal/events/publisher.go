package events

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"

	"github.com/tomovu/enchi/services/auth-service/internal/domain"
)

const (
	exchange   = "learning.events"
	routingKey = "user.registered"
)

// Publisher phát event lên RabbitMQ (topic exchange). Payload khớp
// libs/contracts/events/user_registered.schema.json.
type Publisher struct {
	conn *amqp.Connection
	ch   *amqp.Channel
}

func NewPublisher(url string) (*Publisher, error) {
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
	return &Publisher{conn: conn, ch: ch}, nil
}

type userRegistered struct {
	EventID     string `json:"eventId"`
	UserID      string `json:"userId"`
	Email       string `json:"email"`
	DisplayName string `json:"displayName,omitempty"`
	OccurredAt  string `json:"occurredAt"`
}

func (p *Publisher) PublishUserRegistered(ctx context.Context, eventID string, u domain.User) error {
	body, err := json.Marshal(userRegistered{
		EventID:     eventID,
		UserID:      u.ID,
		Email:       u.Email,
		DisplayName: u.DisplayName,
		OccurredAt:  time.Now().UTC().Format(time.RFC3339),
	})
	if err != nil {
		return err
	}
	if err := p.ch.PublishWithContext(ctx, exchange, routingKey, false, false, amqp.Publishing{
		ContentType:  "application/json",
		DeliveryMode: amqp.Persistent,
		MessageId:    eventID,
		Timestamp:    time.Now(),
		Body:         body,
	}); err != nil {
		return fmt.Errorf("publish user_registered: %w", err)
	}
	return nil
}

func (p *Publisher) Close() {
	if p.ch != nil {
		_ = p.ch.Close()
	}
	if p.conn != nil {
		_ = p.conn.Close()
	}
}
