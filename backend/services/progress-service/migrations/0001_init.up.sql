CREATE TABLE IF NOT EXISTS user_progress (
    user_id          TEXT PRIMARY KEY,
    display_name     TEXT NOT NULL DEFAULT '',
    total_xp         INTEGER NOT NULL DEFAULT 0,
    current_streak   INTEGER NOT NULL DEFAULT 0,
    longest_streak   INTEGER NOT NULL DEFAULT 0,
    last_active_date DATE,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dedup các event đã xử lý (idempotency theo eventId).
CREATE TABLE IF NOT EXISTS processed_events (
    event_id     UUID PRIMARY KEY,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
