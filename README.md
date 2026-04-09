# flint

Open-source AI job search agent. Upload your resume, get matched with jobs from 9 sources, apply with tailored cover letters and resumes.

**Live:** [mafiaguy.github.io/flint](https://mafiaguy.github.io/flint)

---

## What it does

1. **Scrapes jobs** from LinkedIn, Greenhouse, Ashby, Adzuna, Lever, Workable, HackerNews, Naukri — every 8 hours, automatically.
2. **Matches them to your resume** using AI (Gemini Flash + Groq Llama 3.3). Each job gets a score, match reasons, strengths, and gaps.
3. **Helps you apply** with one-click cover letters and resume tailoring — both editable, both exportable as PDF.
4. **Tracks your pipeline** from Applied → Interview → Offer with a drag-and-drop Kanban board.

Everything runs on free tiers. Total cost: **$0/month**.

---

## Architecture

```
GitHub Actions (every 8h)
  └─ scraper (9 sources, 50+ company boards)
       └─ writes to Supabase PostgreSQL
            └─ triggers AI matching (Gemini Flash)

GitHub Pages (static SPA)
  └─ React + shadcn/ui + Tailwind
       └─ reads from Supabase
       └─ calls edge functions for AI, search, resume parsing

Supabase
  ├─ PostgreSQL (jobs, matches, applications, profiles)
  ├─ Edge Functions
  │   ├─ ai (Gemini Flash + Groq, with SHA-256 cache)
  │   ├─ match-jobs (batch scoring orchestrator)
  │   ├─ parse-resume (PDF text extraction)
  │   ├─ search-jobs (Adzuna live search proxy)
  │   ├─ salary-insights (SQL aggregation)
  │   └─ scrape-form (Greenhouse/Lever form detection)
  ├─ Auth (Google + GitHub OAuth)
  └─ Storage (resume uploads)
```

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v4, shadcn/ui, Zustand, react-router-dom (HashRouter) |
| Backend | Supabase (PostgreSQL, Edge Functions, Auth, Storage) |
| AI | Gemini Flash 2.0 (heavy tasks), Groq Llama 3.3 70B (speed tasks), SHA-256 response cache |
| Scraper | Node.js, Playwright, GitHub Actions |
| PDF | @react-pdf/renderer (client-side generation) |
| Drag & drop | @dnd-kit |
| Hosting | GitHub Pages (frontend), Supabase (backend) |

---

## Features

**AI matching** — Upload your resume once. Every job from 9 sources gets scored against your skills, experience, and preferences.

**Chat onboarding** — Instead of a form, a conversational AI asks what you're looking for, extracts structured profile data.

**Cover letter generator** — One click generates a tailored cover letter. Edit in-browser, download as PDF.

**Resume tailoring** — AI analyzes each job posting and suggests specific changes: keywords to add, bullets to reorder, summary rewrite.

**Application tracker** — Kanban board with stages: Applied, First Call, Interview, Second Interview, Offer, Accepted/Rejected. Drag to update.

**Interview prep** — Auto-generated when you move a job to Interview stage. Behavioral questions, technical questions, company research, salary talking points.

**Skill gap analysis** — Aggregates gaps from your matches, recommends skills to develop with learning resources.

**Salary insights** — Market rates from scraped job data. 25th/median/75th percentile for your role and region. Pure SQL, no AI cost.

**Follow-up reminders** — Applications sitting in Applied for 7+ days get flagged.

---

## Setup (20 minutes)

### Prerequisites

Free accounts on:
- [Supabase](https://supabase.com)
- [Google AI Studio](https://aistudio.google.com/apikey) (Gemini API key)
- [Groq](https://console.groq.com) (API key)
- [Adzuna](https://developer.adzuna.com) (API key)

### 1. Fork and clone

```bash
git clone https://github.com/YOUR_USERNAME/flint.git
cd flint
```

### 2. Supabase project

1. [supabase.com](https://supabase.com) → New Project
2. Note your **Project URL**, **anon key**, and **service_role key** from Settings → API

### 3. Run migrations

In Supabase → SQL Editor, run each file in order:

```
supabase/migrations/001_init.sql
supabase/migrations/002_add_auth.sql
supabase/migrations/03_add_questions.sql
supabase/migrations/004_apply_queue.sql
supabase/migrations/005_enhanced_profiles.sql
supabase/migrations/006_job_matches.sql
supabase/migrations/007_enhanced_applications.sql
supabase/migrations/008_onboarding_messages.sql
supabase/migrations/009_ai_cache.sql
```

### 4. Enable auth providers

Supabase → Authentication → Providers:
- Enable **Google** (needs OAuth client from [Google Cloud Console](https://console.cloud.google.com/apis/credentials))
- Enable **GitHub** (needs OAuth App from GitHub → Settings → Developer settings)
- Redirect URL: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`

### 5. Create storage bucket

Supabase → Storage → New Bucket:
- Name: `resumes`
- Public: OFF

### 6. Deploy edge functions

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Set secrets
supabase secrets set GEMINI_API_KEY=your_gemini_key
supabase secrets set GROQ_API_KEY=gsk_your_groq_key
supabase secrets set ADZUNA_APP_ID=your_id
supabase secrets set ADZUNA_APP_KEY=your_key

# Deploy
supabase functions deploy ai
supabase functions deploy match-jobs
supabase functions deploy parse-resume
supabase functions deploy search-jobs
supabase functions deploy scrape-form --no-verify-jwt
supabase functions deploy salary-insights
```

### 7. GitHub secrets

Repo → Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | service_role key |
| `SUPABASE_ANON_KEY` | anon/public key |
| `ADZUNA_APP_ID` | Adzuna App ID |
| `ADZUNA_APP_KEY` | Adzuna App Key |
| `GROQ_API_KEY` | Groq API key (optional, for scraper) |
| `APIFY_TOKEN` | Apify token (optional) |

### 8. Enable GitHub Pages

Repo → Settings → Pages → Source: **GitHub Actions**

### 9. Push and deploy

```bash
git push origin main
```

Two workflows trigger:
- **Build & Deploy Frontend** — builds and deploys to GitHub Pages
- **Scraper** runs on cron (or trigger manually from Actions tab)

### 10. Visit your app

```
https://YOUR_USERNAME.github.io/flint/
```

---

## Repo structure

```
flint/
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Layout: sidebar + routes
│   │   ├── store.js                   # Zustand state management
│   │   ├── api.js                     # Supabase client + helpers
│   │   ├── routes/
│   │   │   ├── Landing.jsx            # Public landing page
│   │   │   ├── Onboarding.jsx         # Chat-based profile setup
│   │   │   ├── Matches.jsx            # AI-matched jobs
│   │   │   ├── JobDetail.jsx          # Job + cover letter + resume tailor
│   │   │   ├── Browse.jsx             # Manual job search
│   │   │   ├── Tracker.jsx            # Kanban application tracker
│   │   │   └── Profile.jsx            # Profile, skill gap, salary insights
│   │   └── components/
│   │       ├── app-sidebar.jsx        # shadcn sidebar with nav + user
│   │       ├── apply/                 # Cover letter + resume editors (PDF export)
│   │       └── ui/                    # shadcn components
│   └── index.html
├── scraper/
│   ├── scrape.js                      # 9-source scraper (~1000 lines)
│   └── package.json
├── supabase/
│   ├── migrations/                    # 9 SQL migrations
│   └── functions/
│       ├── ai/                        # Gemini + Groq with cache
│       ├── match-jobs/                # Batch matching orchestrator
│       ├── parse-resume/              # PDF text extraction
│       ├── search-jobs/               # Adzuna live search
│       ├── salary-insights/           # SQL salary aggregation
│       └── scrape-form/               # Form field detection
└── .github/workflows/
    ├── scrape-jobs.yml                # Cron every 8h + post-scrape matching
    └── deploy-pages.yml               # Auto-deploy on frontend changes
```

---

## AI provider routing

| Feature | Provider | Why |
|---|---|---|
| Chat onboarding | Gemini Flash | Conversational quality |
| Batch matching | Gemini Flash | Heavy lifting, 8 jobs/call |
| Cover letters | Gemini Flash | Writing quality |
| Resume tailoring | Gemini Flash | Analytical + writing |
| Skill gap analysis | Gemini Flash | One-off aggregation |
| Match scoring | Groq (Llama 3.3) | Speed |
| Interview prep | Groq | Speed, low volume |
| Career chat | Groq | Fast, interactive |
| Salary insights | No AI (SQL) | Pure data, zero cost |

All providers have automatic fallback. Responses are cached by SHA-256 input hash (cuts API usage ~40-50%).

---

## Job sources

| Source | Method | Coverage |
|---|---|---|
| LinkedIn | Playwright | Public search results |
| Adzuna | REST API | 10 countries |
| Greenhouse | Public JSON API | 50+ company boards |
| Ashby | Public JSON API | 25+ boards (Notion, OpenAI, Linear...) |
| Lever | Public JSON API | Multiple boards |
| Workable | Widget API | Indian companies (Zerodha, Swiggy...) |
| HackerNews | Algolia API | Monthly "Who's Hiring" |
| Naukri | Playwright | India-specific |
| Apify | API | LinkedIn fallback |

### Adding a company

```javascript
// In scraper/scrape.js
GREENHOUSE_BOARDS.push({ slug: "stripe", name: "Stripe" });
ASHBY_BOARDS.push({ slug: "cursor", name: "Cursor" });
```

---

## Free tier limits

| Service | Free Tier | Flint usage |
|---|---|---|
| Supabase | 500MB DB, 50k edge calls/mo | Well within limits |
| Gemini Flash | 15 RPM, 1M tokens/day | Plenty for matching + generation |
| Groq | 14,400 req/day | Plenty for chat + prep |
| Adzuna | Free API key | All live searches |
| GitHub Actions | 2,000 min/month | ~300 min/month (3 scrapes/day) |
| GitHub Pages | Unlimited | Static frontend |

---

## License

MIT

## Credits

Built by [mafiaguy](https://mafiaguy.github.io).

Uses [Supabase](https://supabase.com), [shadcn/ui](https://ui.shadcn.com), [Groq](https://groq.com), [Google AI](https://ai.google.dev), [Adzuna](https://developer.adzuna.com), and [Playwright](https://playwright.dev).
