-- ═══════════════════════════════════════════════════════
-- FLINT — Migration 009: AI response cache
-- Caches AI outputs by input hash to avoid redundant calls.
-- Expected to cut API usage by 40-50%.
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ai_cache (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  input_hash  TEXT NOT NULL,                -- SHA-256 of (type + prompt/inputs)
  type        TEXT NOT NULL,                -- AI call type: match, cover, chat, etc.
  output      TEXT NOT NULL,                -- cached LLM response
  model       TEXT,                         -- which model produced it
  created_at  TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ,                  -- NULL = never expires
  hit_count   INTEGER DEFAULT 0,           -- how many times this cache was hit
  UNIQUE(input_hash)
);

CREATE INDEX IF NOT EXISTS idx_cache_hash ON ai_cache(input_hash);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON ai_cache(expires_at) WHERE expires_at IS NOT NULL;

-- Auto-cleanup: delete expired entries (run via pg_cron or manually)
-- DELETE FROM ai_cache WHERE expires_at IS NOT NULL AND expires_at < now();

-- No RLS — this is a server-side table accessed only via service role key
