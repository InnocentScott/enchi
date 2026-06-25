import * as amqp from 'amqplib';
import { SrsService } from '../service/srs-service';

const EXCHANGE = 'learning.events';
const QUEUE = 'srs.quiz_completed';

export interface Consumer {
  close(): Promise<void>;
}

export async function startConsumer(url: string, svc: SrsService): Promise<Consumer> {
  const connection = await amqp.connect(url);
  const channel = await connection.createChannel();
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  await channel.assertQueue(QUEUE, { durable: true });
  await channel.bindQueue(QUEUE, EXCHANGE, 'quiz.completed');
  await channel.prefetch(10);

  await channel.consume(QUEUE, async (msg) => {
    if (!msg) return;
    try {
      const evt = JSON.parse(msg.content.toString());
      await svc.handleQuizCompleted(evt.eventId, evt.userId, evt.results ?? []);
      channel.ack(msg);
    } catch (e) {
      console.error(JSON.stringify({ level: 'error', msg: 'handle quiz_completed', err: String(e) }));
      // payload hỏng -> drop; lỗi tạm thời -> requeue (dedup đảm bảo an toàn).
      if (e instanceof SyntaxError) channel.ack(msg);
      else channel.nack(msg, false, true);
    }
  });

  console.log(JSON.stringify({ level: 'info', msg: 'srs consuming quiz.completed' }));
  return {
    close: async () => {
      await channel.close().catch(() => undefined);
      await connection.close().catch(() => undefined);
    },
  };
}
