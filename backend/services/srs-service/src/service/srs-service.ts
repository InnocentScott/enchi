import { SrsStore, ReviewResult, DueCard } from '../store/srs-store';

export interface QuizResult {
  vocabId: string;
  correct: boolean;
  quality?: number;
}

export class SrsService {
  constructor(private readonly store: SrsStore) {}

  // Consume quiz_completed: dedup + upsert tất cả thẻ trong 1 transaction.
  async handleQuizCompleted(eventId: string, userId: string, results: QuizResult[], now = new Date()): Promise<boolean> {
    const client = await this.store.getClient();
    try {
      await client.query('BEGIN');
      const fresh = await this.store.markProcessed(client, eventId);
      if (!fresh) {
        await client.query('COMMIT');
        return false; // duplicate
      }
      for (const r of results) {
        const quality = r.quality ?? (r.correct ? 5 : 2);
        await this.store.applyReview(userId, r.vocabId, quality, now, client);
      }
      await client.query('COMMIT');
      return true;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  getDue(userId: string, limit: number): Promise<DueCard[]> {
    return this.store.getDue(userId, limit);
  }

  // Ôn thủ công 1 thẻ (màn "Ôn tập hôm nay").
  answer(userId: string, vocabId: string, quality: number): Promise<ReviewResult> {
    return this.store.applyReview(userId, vocabId, quality, new Date());
  }
}
