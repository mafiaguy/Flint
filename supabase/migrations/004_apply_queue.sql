-- ═══════════════════════════════════════════════════════
-- 🔥 FLINT — Migration 004: Auto-apply queue + resume storage
-- ═══════════════════════════════════════════════════════

-- Application queue (jobs waiting to be auto-submitted)
CREATE TABLE IF NOT EXISTS apply_queue (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id       TEXT NOT NULL,
  job_title    TEXT,
  company      TEXT,
  job_url      TEXT NOT NULL,        -- The actual application form URL
  source       TEXT,                 -- Greenhouse, Lever, Ashby, Other
  board_slug   TEXT,                 -- e.g. "stripe" for Greenhouse
  gh_job_id    TEXT,                 -- Greenhouse job ID (for direct form filling)
  cover_letter TEXT,
  answers      JSONB,               -- {question: answer} pairs
  resume_url   TEXT,                 -- Supabase Storage URL
  status       TEXT DEFAULT 'pending',  -- pending, submitting, submitted, failed, manual
  error        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ
);

ALTER TABLE apply_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "queue_select_own" ON apply_queue
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "queue_insert_own" ON apply_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "queue_update_own" ON apply_queue
  FOR UPDATE USING (auth.uid() = user_id);

-- Add resume_url to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_url TEXT;

-- Storage bucket for resumes (create via dashboard or CLI)
-- Go to Supabase Dashboard → Storage → New Bucket → name: "resumes" → Public: OFF
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT DO NOTHING;

-- Storage policy: users can upload/read their own resumes
CREATE POLICY "Users upload own resume"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users read own resume"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own resume"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);