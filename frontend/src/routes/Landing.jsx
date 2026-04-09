import { useState } from 'react';
import { C, MONO } from '../theme';
import AuthModal from '../components/layout/AuthModal';

export default function Landing() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>{"\u{1F525}"}</span>
          <span style={{ fontSize: 20, fontWeight: 900, background: C.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FLINT</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="https://github.com/mafiaguy/flint" target="_blank" rel="noreferrer"
            style={{ padding: "8px 16px", border: `1px solid ${C.br}`, borderRadius: 8, color: C.t2, fontSize: 13 }}>
            GitHub
          </a>
          <button onClick={() => setShowAuth(true)}
            style={{ padding: "8px 20px", background: C.grad, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Sign In
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 24px 60px", textAlign: "center" }}>
        <div style={{
          display: "inline-block", padding: "6px 16px", border: `1px solid ${C.acc}33`,
          borderRadius: 99, fontSize: 12, color: C.acc, fontFamily: MONO, marginBottom: 20,
        }}>
          YOUR AI JOB SEARCH AGENT
        </div>
        <h1 style={{ fontSize: "clamp(36px,6vw,56px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
          <span style={{ background: C.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Stop hunting.
          </span>
          <br />
          <span style={{ color: C.t1 }}>Start matching.</span>
        </h1>
        <p style={{ fontSize: 18, color: C.t2, maxWidth: 520, margin: "0 auto 36px", lineHeight: 1.7 }}>
          Upload your resume. FLINT's AI matches you with the best jobs from 9 sources, tailors your cover letter, and helps you track every application.
        </p>
        <button onClick={() => setShowAuth(true)}
          style={{ padding: "16px 40px", background: C.grad, color: "#fff", border: "none", borderRadius: 12, fontSize: 17, fontWeight: 800, cursor: "pointer" }}>
          Get Started -- Free
        </button>
        <p style={{ color: C.t3, fontSize: 12, marginTop: 12 }}>No credit card. No API keys. Just sign in.</p>
      </div>

      {/* Source badges */}
      <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", padding: "0 24px 60px", maxWidth: 680, margin: "0 auto" }}>
        {["LinkedIn", "Adzuna", "Greenhouse", "Lever", "Ashby", "Workable", "HackerNews", "Naukri"].map((s) => (
          <span key={s} style={{ padding: "6px 16px", border: `1px solid ${C.br}`, borderRadius: 99, fontSize: 12, color: C.t2, fontFamily: MONO }}>
            {s}
          </span>
        ))}
      </div>

      {/* Features */}
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 24px 80px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
        {[
          { i: "\u{26A1}", t: "AI Matching", d: "Your resume matched against 10,000+ jobs. Instantly." },
          { i: "\u{1F4DD}", t: "Tailored Resumes", d: "AI customizes your resume for each application." },
          { i: "\u{2709}\u{FE0F}", t: "Cover Letters", d: "One-click generation, fully editable." },
          { i: "\u{1F4CB}", t: "Pipeline Tracker", d: "Kanban board from Applied to Offer." },
          { i: "\u{1F50D}", t: "9 Job Sources", d: "Scraped fresh every 8 hours." },
          { i: "\u{1F4B0}", t: "$0/month", d: "Fully open source. MIT license." },
        ].map((f, i) => (
          <div key={i} style={{
            background: C.c1, border: `1px solid ${C.br}`, borderRadius: 16, padding: 20,
            animation: `up .4s ease ${i * 0.06}s both`,
          }}>
            <span style={{ fontSize: 28, display: "block", marginBottom: 10 }}>{f.i}</span>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.t1, marginBottom: 6 }}>{f.t}</h3>
            <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.6 }}>{f.d}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center", padding: "40px 24px 60px", borderTop: `1px solid ${C.br}` }}>
        <button onClick={() => setShowAuth(true)}
          style={{ padding: "14px 36px", background: C.grad, color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
          Launch FLINT
        </button>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "20px 24px", borderTop: `1px solid ${C.br}`, fontSize: 12, color: C.t3 }}>
        Built by <a href="https://mafiaguy.github.io" target="_blank" rel="noreferrer" style={{ color: C.acc }}>mafiaguy</a>
        {" "}&middot;{" "}
        <a href="https://github.com/mafiaguy/flint" target="_blank" rel="noreferrer" style={{ color: C.t2 }}>Source</a>
        {" "}&middot; MIT
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
