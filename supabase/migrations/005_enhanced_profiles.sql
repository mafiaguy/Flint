-- ═══════════════════════════════════════════════════════
-- FLINT — Migration 005: Enhanced profiles for AI agent
-- Adds fields for chat-based onboarding and AI matching
-- ═══════════════════════════════════════════════════════

-- Onboarding flag
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- Job preferences (populated via chat onboarding)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_roles TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_regions TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS salary_min INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS salary_max INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS salary_currency TEXT DEFAULT 'USD';

-- Extracted resume text for AI matching (avoids re-parsing PDF each time)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_text TEXT;
