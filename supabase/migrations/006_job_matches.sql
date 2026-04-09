-- ═══════════════════════════════════════════════════════
-- FLINT — Migration 006: AI job match cache
-- Stores precomputed match scores between users and jobs
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS job_matches (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id      TEXT REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  score       REAL NOT NULL,              -- 0.0 to 1.0
  reasons     JSONB NOT NULL DEFAULT '[]', -- [{category, detail}]
  strengths   TEXT[],
  gaps        TEXT[],
  verdict     TEXT,                       -- "apply" | "stretch" | "skip"
  computed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_user_score ON job_matches(user_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_matches_computed ON job_matches(computed_at);

-- Row Level Security
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches_select_own" ON job_matches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "matches_insert_own" ON job_matches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "matches_update_own" ON job_matches
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "matches_delete_own" ON job_matches
  FOR DELETE USING (auth.uid() = user_id);
