import { Pool } from 'pg';

// Migration versioned (tracked trong schema_migrations) — chạy lúc khởi động.
const MIGRATIONS: { version: string; sql: string }[] = [
  {
    version: '0001_init',
    sql: `
      CREATE TABLE IF NOT EXISTS srs_cards (
        user_id       TEXT NOT NULL,
        vocab_id      TEXT NOT NULL,
        ease_factor   REAL NOT NULL DEFAULT 2.5,
        interval_days INTEGER NOT NULL DEFAULT 0,
        repetitions   INTEGER NOT NULL DEFAULT 0,
        due_date      DATE NOT NULL,
        last_reviewed TIMESTAMPTZ,
        PRIMARY KEY (user_id, vocab_id)
      );
      CREATE INDEX IF NOT EXISTS idx_srs_due ON srs_cards (user_id, due_date);
      CREATE TABLE IF NOT EXISTS processed_events (
        event_id     UUID PRIMARY KEY,
        processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `,
  },
];

export async function runMigrations(pool: Pool): Promise<void> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       version TEXT PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
  );
  for (const m of MIGRATIONS) {
    const { rowCount } = await pool.query('SELECT 1 FROM schema_migrations WHERE version = $1', [m.version]);
    if (rowCount && rowCount > 0) continue;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(m.sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [m.version]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
