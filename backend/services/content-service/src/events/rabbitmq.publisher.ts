import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

const EXCHANGE = 'learning.events';

@Injectable()
export class RabbitMQPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQPublisher.name);
  private connection?: Awaited<ReturnType<typeof amqp.connect>>;
  private channel?: amqp.Channel;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL');
    if (!url) throw new Error('RABBITMQ_URL missing');
    const connection = await amqp.connect(url);
    const channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    this.connection = connection;
    this.channel = channel;
    this.logger.log('RabbitMQ publisher ready');
  }

  // Payload phải khớp JSON Schema ở libs/contracts; bao gồm eventId để consumer dedup.
  async publish(routingKey: string, payload: Record<string, unknown> & { eventId: string }) {
    if (!this.channel) throw new Error('RabbitMQ channel not ready');
    const body = Buffer.from(JSON.stringify(payload));
    this.channel.publish(EXCHANGE, routingKey, body, {
      contentType: 'application/json',
      persistent: true,
      messageId: payload.eventId,
      timestamp: Date.now(),
    });
  }

  async onModuleDestroy() {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }
}
