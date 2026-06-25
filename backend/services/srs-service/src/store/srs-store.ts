import { Pool, PoolClient } from 'pg';
import { review, SrsState, INITIAL_STATE } from '../srs/sm2';

export interface DueCard {
  vocabId: string;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  dueDate: string;
}

export interface ReviewResult extends SrsState {
  vocabId: string;
  dueDate: string;
}

export class SrsStore {
  constructor(private readonly pool: Pool) {}

  getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  // Cố đánh dấu event đã xử lý; trả true nếu lần đầu (idempotency).
  async markProcessed(client: PoolClient, eventId: string): Promise<boolean> {
    const r = await client.query(
      'INSERT INTO processed_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING',
      [eventId],
    );
    return r.rowCount === 1;
  }

  // Áp dụng SM-2 cho 1 thẻ: nạp state hiện tại -> review(quality) -> tính due_date -> upsert.
  async applyReview(
    userId: string,
    vocabId: string,
    quality: number,
    now: Date,
    exec: Pool | PoolClient = this.pool,
  ): Promise<ReviewResult> {
    const existing = await exec.query(
      'SELECT ease_factor, interval_days, repetitions FROM srs_cards WHERE user_id = $1 AND vocab_id = $2',
      [userId, vocabId],
    );
    const state: SrsState = existing.rowCount
      ? {
          easeFactor: existing.rows[0].ease_factor,
          intervalDays: existing.rows[0].interval_days,
          repetitions: existing.rows[0].repetitions,
        }
      : { ...INITIAL_STATE };

    const next = review(state, quality);
    const due = new Date(now);
    due.setUTCDate(due.getUTCDate() + next.intervalDays);
    const dueDate = due.toISOString().slice(0, 10);

    await exec.query(
      `INSERT INTO srs_cards (user_id, vocab_id, ease_factor, interval_days, repetitions, due_date, last_reviewed)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (user_id, vocab_id) DO UPDATE SET
         ease_factor = $3, interval_days = $4, repetitions = $5, due_date = $6, last_reviewed = now()`,
      [userId, vocabId, next.easeFactor, next.intervalDays, next.repetitions, dueDate],
    );

    return { ...next, vocabId, dueDate };
  }

  async getDue(userId: string, limit: number): Promise<DueCard[]> {
    const { rows } = await this.pool.query(
      `SELECT vocab_id, repetitions, interval_days, ease_factor, to_char(due_date, 'YYYY-MM-DD') AS due_date
       FROM srs_cards
       WHERE user_id = $1 AND due_date <= CURRENT_DATE
       ORDER BY due_date ASC
       LIMIT $2`,
      [userId, limit],
    );
    return rows.map((r) => ({
      vocabId: r.vocab_id,
      repetitions: r.repetitions,
      intervalDays: r.interval_days,
      easeFactor: r.ease_factor,
      dueDate: r.due_date,
    }));
  }
}
