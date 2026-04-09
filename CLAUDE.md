# CLAUDE.md — FLINT

## Project Overview

**FLINT** is an AI-powered job hunting platform that scrapes 10,000+ jobs from 9 sources, scores them against the user's profile, and helps apply with tailored cover letters and resumes. Deployed at [mafiaguy.github.io/flint](https://mafiaguy.github.io/flint).

## Architecture

```
Frontend (React + Vite)  →  Supabase Edge Functions (AI)  →  Groq / Gemini LLMs
     ↕                           ↕
Supabase (PostgreSQL)     Supabase Storage (resumes)
     ↕
GitHub Actions (job scraping, GitHub Pages deploy)
```

- **Frontend**: React 18, Vite, Zustand, shadcn/ui + Tailwind CSS, `@react-pdf/renderer`, `@dnd-kit`
- **Backend**: Supabase Edge Functions (Deno), Supabase PostgreSQL, Supabase Auth (GitHub/Google OAuth)
- **AI**: Gemini Flash 2.0 (heavy/analytical), Groq Llama 3.3 70B (speed-critical)
- **Hosting**: GitHub Pages (frontend), Supabase (backend + DB + storage)

## Quick Commands

```bash
# Frontend dev
cd frontend && npm run dev

# Build & deploy (auto via GitHub Actions on push to main)
cd frontend && npm run build
git push origin main

# Deploy a single edge function
~/bin/supabase functions deploy <function-name>
# Some functions need --no-verify-jwt: scrape-form, trigger-apply, match-jobs

# Deploy all edge functions
~/bin/supabase functions deploy

# Supabase CLI is installed at ~/bin/supabase (not in PATH)
# Project is linked to ref: otkxylshqghowzzbhtqk
```

## Edge Functions (supabase/functions/)

| Function | Provider | JWT | Purpose |
|---|---|---|---|
| `ai` | Gemini/Groq | verify | Main AI hub — onboard, chat, match, cover, tailor-resume, skill-gap, rewrite-latex, generate-latex |
| `match-jobs` | Groq | **no-verify** | Batch job matching (8 jobs/LLM call, max 120/run) |
| `search-jobs` | — | verify | Live job search (Supabase + Adzuna API) |
| `parse-resume` | — | verify | PDF text extraction (basic, fails on LaTeX PDFs) |
| `salary-insights` | — | verify | Salary aggregation from scraped jobs |
| `scrape-form` | — | **no-verify** | Greenhouse/Lever/Ashby form scraping |
| `trigger-apply` | — | **no-verify** | Triggers GitHub Actions auto-apply workflow |

### AI Types (routed in ai/index.ts)

**Gemini** (heavy): onboard, batch-match, cover, tailor-resume, skill-gap, rewrite-latex, generate-latex
**Groq** (speed): match, chat, interview-prep

## Frontend Structure (frontend/src/)

| File | Purpose |
|---|---|
| `App.jsx` | Router + auth guard |
| `store.js` | Zustand global state |
| `api.js` | Supabase client + edge function helpers |
| `theme.js` | Constants: FLAGS, CATS, PIPELINE_STAGES, colors |
| `routes/Matches.jsx` | AI-scored job matches with search + filters |
| `routes/Browse.jsx` | Manual job search/filtering |
| `routes/Tracker.jsx` | Kanban pipeline (drag-and-drop, 9 stages) |
| `routes/Profile.jsx` | Edit profile, preferences, skill gap, salary |
| `routes/Onboarding.jsx` | Chat-based AI profile setup |
| `routes/JobDetail.jsx` | Job page + cover letter + resume tailor |
| `components/apply/CoverLetterEditor.jsx` | AI cover letter generation + PDF download |
| `components/apply/ResumeEditor.jsx` | LaTeX resume editor/renderer/tailor |
| `components/ui/loading-message.jsx` | Witty rotating loading messages |
| `components/app-sidebar.jsx` | Navigation sidebar |

## Database Tables (Supabase PostgreSQL)

| Table | Purpose |
|---|---|
| `profiles` | User profile, preferences, resume_text (LaTeX) |
| `jobs` | 10K+ scraped job listings |
| `job_matches` | Pre-computed AI match scores |
| `applications` | User's tracked applications |
| `saved_qa` | Interview Q&A pairs |
| `onboarding_messages` | Chat history from onboarding |
| `ai_cache` | LLM response cache (SHA-256 hash key) |

## CORS

All edge functions include `cache-control, pragma` in `Access-Control-Allow-Headers` to prevent browser preflight rejections.

## Resume Workflow

The user's resume is stored as **LaTeX source** in `profiles.resume_text`. The ResumeEditor:
1. Parses LaTeX into an AST (handles `\resumeSubheading`, `\resumeItem`, etc.)
2. Renders HTML preview mimicking pdflatex output
3. Generates PDF via `@react-pdf/renderer` from the same AST
4. AI suggestions compare parsed resume vs JD
5. "Apply Suggestions" calls `rewrite-latex` (Gemini) which rewrites only the document body
6. Changes tab shows semantic section-by-section diff

**Known issue**: The basic PDF parser (`parse-resume`) fails on LaTeX-compiled PDFs. Users must paste LaTeX code manually.

## Tracker Pipeline Stages

applied → first_call → interview → second_interview → offer → accepted → not_selected → rejected → withdrawn

## What's Been Done (Session 2026-04-10)

- Fixed CORS across all 7 edge functions (added cache-control, pragma)
- Fixed match-jobs 401 auth (deployed with --no-verify-jwt, fixed getUser call)
- Fixed region filtering (remote jobs now bypass country filter)
- Added preferences section to Profile (clickable badges for regions/roles)
- Added "Not Selected" stage to tracker pipeline
- Added "Hide applied" filter + search to Matches page
- Added email chooser for cover letter and resume PDFs
- Fixed tracker drag-and-drop (useDroppable on columns, move-to buttons, remove button)
- Rewrote ResumeEditor as full LaTeX workflow (editor, rendered preview, AI suggestions, changes diff)
- Fixed job description rendering (HTML entities decoded properly)
- Added witty rotating loading messages across all spinners
- Added 429 retry logic to AI edge function
- Added dedicated `rewrite-latex` and `generate-latex` AI types (Gemini)
- Cleaned garbage resume_text from database
- Installed Supabase CLI at ~/bin/supabase

## Known Issues / Pending

- **Salary Insights**: Returns "Not enough salary data" — needs investigation (salary parsing heuristics may be too strict, or not enough jobs have salary field populated)
- **LaTeX rewrite quality**: Gemini sometimes still includes advice text — may need prompt iteration
- **PDF download**: May still fail on edge cases in the LaTeX parser (untested with all resume formats)
- **Resume PDF parser**: `parse-resume` edge function uses basic regex extraction that fails on LaTeX/image PDFs — consider using a proper PDF library or external API
- **Mobile responsiveness**: Tracker kanban not optimized for small screens
- **Auto-apply workflow**: `trigger-apply` triggers GitHub Actions but the actual Playwright worker is not verified
