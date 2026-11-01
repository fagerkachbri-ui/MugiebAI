/*
# Add visitor_id column to usage_logs

1. Changes
- Add `visitor_id` text column (nullable) to `usage_logs`.
- Backfill existing rows with NULL (no data loss).
- Add index on (visitor_id, created_at) for per-visitor rate-limit queries.

2. Purpose
- The chat edge function needs to enforce rate limits per visitor (not globally).
- visitor_id lets us count requests from a specific visitor within a time window.

3. Security
- No policy changes — existing RLS policies remain intact.
- service_role already has INSERT on usage_logs, so the edge function can write visitor_id.
*/

ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS visitor_id text;

CREATE INDEX IF NOT EXISTS idx_usage_visitor_time ON usage_logs(visitor_id, created_at);
