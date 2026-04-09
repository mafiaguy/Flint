-- ═══════════════════════════════════════════════════════
-- FLINT — Migration 008: Onboarding conversation log
-- Stores chat-based onboarding messages for each user
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS onboarding_messages (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role       TEXT NOT NULL,  -- 'user' or 'assistant'
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboard_user ON onboarding_messages(user_id, created_at);

-- Row Level Security
ALTER TABLE onboarding_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboard_select_own" ON onboarding_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "onboard_insert_own" ON onboarding_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
