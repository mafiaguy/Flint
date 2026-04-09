import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AuthModal from '@/components/layout/AuthModal';

const SOURCES = ['LinkedIn', 'Adzuna', 'Greenhouse', 'Ashby', 'Lever', 'Workable', 'HackerNews', 'Naukri'];

const FEATURES = [
  { t: 'Resume matching', d: 'Upload once. Every job gets scored against your experience, skills, and preferences.' },
  { t: '9 job sources', d: 'LinkedIn, Greenhouse, Ashby, Adzuna, and 5 more scraped every 8 hours.' },
  { t: 'Cover letters', d: 'One-click generation tailored to each role. Edit in-browser, export as PDF.' },
  { t: 'Resume tailoring', d: 'AI analyzes each job and suggests specific changes to your resume.' },
  { t: 'Application tracker', d: 'Kanban board from Applied through Interview to Offer.' },
  { t: 'Interview prep', d: 'Auto-generated questions, talking points, and company research.' },
];

const PREVIEW_JOBS = [
  { score: 92, title: 'Senior Platform Engineer', company: 'Datadog', loc: 'Remote', src: 'Greenhouse' },
  { score: 87, title: 'Site Reliability Engineer', company: 'GitLab', loc: 'Remote', src: 'Ashby' },
  { score: 81, title: 'Cloud Infrastructure Lead', company: 'Stripe', loc: 'US / Remote', src: 'Greenhouse' },
  { score: 74, title: 'DevOps Engineer', company: 'Razorpay', loc: 'Bangalore', src: 'LinkedIn' },
];

export default function Landing() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="text-base font-extrabold">flint</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a href="https://github.com/mafiaguy/flint" target="_blank" rel="noreferrer">GitHub</a>
          </Button>
          <Button size="sm" onClick={() => setShowAuth(true)}>Sign in</Button>
        </div>
      </nav>

      {/* Hero */}
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
        <div>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            Jobs matched to your resume, not the other way around
          </h1>
          <p className="mt-4 max-w-lg text-base text-muted-foreground leading-relaxed">
            FLINT scrapes 10,000+ jobs from 9 sources every 8 hours, scores each one against your profile, and helps you apply with tailored cover letters and resumes.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Button onClick={() => setShowAuth(true)}>Get started</Button>
            <span className="text-sm text-muted-foreground">Free and open source</span>
          </div>
        </div>

        {/* Preview card */}
        <Card className="p-5">
          <p className="mb-3 text-xs font-medium text-muted-foreground">Top matches for you</p>
          <div className="flex flex-col gap-2">
            {PREVIEW_JOBS.map((j, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <span className={`w-9 text-center font-mono text-sm font-bold ${j.score >= 85 ? 'text-green-400' : j.score >= 75 ? 'text-yellow-400' : 'text-muted-foreground'}`}>
                  {j.score}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{j.title}</div>
                  <div className="text-xs text-muted-foreground">{j.company} &middot; {j.loc}</div>
                </div>
                <span className="text-xs text-muted-foreground">{j.src}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Sources */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 pb-12">
        <span className="text-xs text-muted-foreground">Sources:</span>
        {SOURCES.map((s) => (
          <Badge key={s} variant="outline" className="font-normal">{s}</Badge>
        ))}
      </div>

      {/* Features */}
      <div className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="mb-6 text-lg font-semibold">How it works</h2>
        <div className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div key={i} className="bg-card p-6">
              <h3 className="mb-1.5 text-sm font-semibold">{f.t}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-5 text-center text-xs text-muted-foreground">
        Built by <a href="https://mafiaguy.github.io" target="_blank" rel="noreferrer" className="hover:text-foreground">mafiaguy</a>
        {' '}&middot;{' '}
        <a href="https://github.com/mafiaguy/flint" target="_blank" rel="noreferrer" className="hover:text-foreground">Source</a>
        {' '}&middot; MIT
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
