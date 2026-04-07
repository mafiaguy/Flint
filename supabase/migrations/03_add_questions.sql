-- ═══════════════════════════════════════════════════════
-- 🔥 FLINT — Migration 003: Add application questions column
-- Greenhouse scraper now fetches form questions per job
-- ═══════════════════════════════════════════════════════

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS questions JSONB;

-- Update category options for broader tech job coverage
COMMENT ON COLUMN jobs.category IS 'SRE, Platform, Security, DevSecOps, DevOps, Infrastructure, Cloud, Data, ML/AI, Frontend, Backend, Fullstack, Mobile, QA, Product, Architect, Design, Engineering';