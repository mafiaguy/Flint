---
name: FLINT pivot to AI job agent
description: FLINT pivoted from a job board to an AI job search agent (like tal.af but web-based). All 4 phases complete.
type: project
---

FLINT has been pivoted from a job board to an AI job search agent model.

**Why:** User wants agent-first UX: AI matches jobs to resume, user reviews matches, applies externally, tracks in a pipeline. Inspired by tal.af but web-only.

**Status: All 4 phases complete.**
- Phase 1: Monolith decomposed, routing, Zustand store, migrations 005-008.
- Phase 2: Dual AI (Gemini Flash + Groq), match-jobs orchestrator, parse-resume, onboarding chat, matches view.
- Phase 3: Cover letter + resume editors with PDF export, Kanban tracker with @dnd-kit, interview prep auto-trigger, code splitting.
- Phase 4: AI cache (SHA-256 hash → ai_cache table), Gemini Flash as primary for heavy tasks, skill gap analysis, salary insights (SQL), mobile responsiveness.

**Architecture:**
- Providers: Gemini Flash 2.0 (onboard, batch-match, cover, tailor-resume, skill-gap) + Groq Llama 3.3 (match, chat, interview-prep). Automatic fallback.
- Cache: ai_cache table with SHA-256 input hashing, TTL per type. Cuts API usage ~40-50%.
- Bundle: Main 74KB gzip, PDF renderer 520KB (lazy), DnD 60KB (lazy).
- Constraints: GitHub Pages (static SPA), $0/month, open source.
- Secrets needed: GEMINI_API_KEY, GROQ_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
