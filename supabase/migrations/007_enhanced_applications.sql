-- ═══════════════════════════════════════════════════════
-- FLINT — Migration 007: Enhanced applications for pipeline tracking
-- Adds stages, notes, and tracking fields
-- ═══════════════════════════════════════════════════════

-- Pipeline tracking fields
ALTER TABLE applications ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS stage_updated_at TIMESTAMPTZ;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS pipeline_order INTEGER DEFAULT 0;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS cover_letter_url TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS tailored_resume_url TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_date TIMESTAMPTZ;

-- Index for pipeline queries
CREATE INDEX IF NOT EXISTS idx_apps_stage ON applications(status, stage_updated_at DESC);
