import { useState, useEffect, useCallback } from 'react';
import { pdf, Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';
import { C, MONO } from '../../theme';
import { db } from '../../api';
import useStore from '../../store';

// ── LaTeX → structured data parser ──
function parseLatex(src) {
  let t = src;
  // Strip comments
  t = t.replace(/%.*$/gm, '');
  // Strip preamble
  t = t.replace(/[\s\S]*?\\begin\{document\}/, '');
  t = t.replace(/\\end\{document\}[\s\S]*/, '');
  // Normalize line breaks
  t = t.replace(/\\\\(\[.*?\])?/g, '\n');
  t = t.replace(/\\newline/g, '\n');
  // Convert \hfill to tab separator
  t = t.replace(/\\hfill/g, ' | ');
  // Strip font size commands
  t = t.replace(/\\(tiny|scriptsize|footnotesize|small|normalsize|large|Large|LARGE|huge|Huge)\b/g, '');
  // Inline formatting
  t = t.replace(/\\textbf\{([^}]*)\}/g, '<b>$1</b>');
  t = t.replace(/\\textit\{([^}]*)\}/g, '<i>$1</i>');
  t = t.replace(/\\emph\{([^}]*)\}/g, '<i>$1</i>');
  t = t.replace(/\\underline\{([^}]*)\}/g, '<u>$1</u>');
  t = t.replace(/\\href\{([^}]*)\}\{([^}]*)\}/g, '<a href="$1">$2</a>');
  // Sections
  t = t.replace(/\\section\*?\{([^}]*)\}/g, '\n<section>$1</section>\n');
  t = t.replace(/\\subsection\*?\{([^}]*)\}/g, '\n<subsection>$1</subsection>\n');
  // Items
  t = t.replace(/\\item\s*/g, '<item>');
  // Strip environments
  t = t.replace(/\\begin\{[^}]*\}(\[[^\]]*\])?/g, '');
  t = t.replace(/\\end\{[^}]*\}/g, '');
  // Strip layout commands
  t = t.replace(/\\(vspace|hspace|vfill|pagebreak|clearpage|newpage|noindent|centering|raggedright|raggedleft|par|medskip|bigskip|smallskip)\*?(\{[^}]*\})?/g, '');
  // Strip remaining \command{text} → text
  t = t.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1');
  // Strip remaining commands
  t = t.replace(/\\[a-zA-Z]+\*?/g, '');
  // Clean braces, special chars
  t = t.replace(/[{}]/g, '');
  t = t.replace(/~/g, '\u00a0');
  t = t.replace(/\\&/g, '&');
  t = t.replace(/---/g, '\u2014');
  t = t.replace(/--/g, '\u2013');
  // Clean whitespace
  t = t.replace(/[ \t]+/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

// ── Detect garbage text ──
function isGarbageText(text) {
  if (!text || text.length < 20) return true;
  return /^%PDF|obj\s*<<|\/Filter\s*\/FlateDecode|endobj|xref|startxref/.test(text);
}

// ── Detect if text is LaTeX source ──
function isLatex(text) {
  if (!text) return false;
  return /\\(section|begin|documentclass|textbf|item|href)\b/.test(text);
}

// ── Render parsed LaTeX as HTML preview ──
function LatexPreview({ html, profile, email }) {
  return (
    <div style={{
      background: '#fff', color: '#1a1a1a', borderRadius: 4, padding: '40px 50px',
      maxHeight: 550, overflow: 'auto', fontFamily: '"Computer Modern Serif", "Latin Modern Roman", Georgia, "Times New Roman", serif',
      fontSize: 11, lineHeight: 1.55, border: `1px solid ${C.br}`,
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 0.5 }}>{profile?.name || 'Your Name'}</div>
        <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>
          {[email || profile?.email, profile?.role].filter(Boolean).join(' | ')}
        </div>
      </div>
      <div style={{ borderBottom: '1.5px solid #1a1a1a', marginBottom: 10 }} />
      {/* Body */}
      <div dangerouslySetInnerHTML={{ __html: formatParsedHtml(html) }} />
    </div>
  );
}

function formatParsedHtml(parsed) {
  let html = parsed;
  // Section headers
  html = html.replace(/<section>(.*?)<\/section>/g,
    '<div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;border-bottom:1px solid #999;padding-bottom:2px;margin:14px 0 6px;color:#1a1a1a">$1</div>');
  html = html.replace(/<subsection>(.*?)<\/subsection>/g,
    '<div style="font-size:11px;font-weight:700;margin:8px 0 3px;color:#333">$1</div>');
  // Items
  html = html.replace(/<item>/g,
    '<div style="padding-left:16px;text-indent:-12px;margin-bottom:2px">\u2022 ');
  // Bold/italic
  html = html.replace(/<b>(.*?)<\/b>/g, '<strong>$1</strong>');
  html = html.replace(/<i>(.*?)<\/i>/g, '<em>$1</em>');
  html = html.replace(/<u>(.*?)<\/u>/g, '<span style="text-decoration:underline">$1</span>');
  // Links
  html = html.replace(/<a href="([^"]*)">(.*?)<\/a>/g,
    '<a href="$1" style="color:#2563eb;text-decoration:underline" target="_blank">$2</a>');
  // Paragraphs from double newlines
  html = html.replace(/\n\n+/g, '</div><div style="margin-bottom:6px">');
  html = html.replace(/\n/g, '<br/>');
  html = '<div style="margin-bottom:6px">' + html + '</div>';
  return html;
}

// ── PDF from parsed LaTeX ──
const ps = StyleSheet.create({
  page: { padding: '40 50', fontFamily: 'Helvetica', fontSize: 10.5, color: '#1a1a1a', lineHeight: 1.5 },
  headerName: { fontSize: 20, fontWeight: 'bold', fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  headerContact: { fontSize: 9.5, color: '#555', textAlign: 'center', marginTop: 3 },
  rule: { borderBottomWidth: 1.5, borderBottomColor: '#1a1a1a', marginTop: 8, marginBottom: 8 },
  section: { fontSize: 11.5, fontWeight: 'bold', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1.2, borderBottomWidth: 0.75, borderBottomColor: '#999', paddingBottom: 1.5, marginTop: 10, marginBottom: 5 },
  subsection: { fontSize: 10.5, fontWeight: 'bold', fontFamily: 'Helvetica-Bold', marginTop: 6, marginBottom: 2 },
  body: { fontSize: 10.5, lineHeight: 1.5 },
  item: { fontSize: 10.5, lineHeight: 1.5, paddingLeft: 14, marginBottom: 1.5 },
  para: { marginBottom: 4 },
});

function LatexResumePDF({ parsed, profile, email }) {
  // Convert parsed HTML-like markup to react-pdf elements
  const elements = [];
  const lines = parsed.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const sectionMatch = line.match(/<section>(.*?)<\/section>/);
    const subMatch = line.match(/<subsection>(.*?)<\/subsection>/);
    if (sectionMatch) {
      elements.push(<Text key={i} style={ps.section}>{strip(sectionMatch[1])}</Text>);
    } else if (subMatch) {
      elements.push(<Text key={i} style={ps.subsection}>{strip(subMatch[1])}</Text>);
    } else if (line.startsWith('<item>')) {
      elements.push(<Text key={i} style={ps.item}>{'\u2022  '}{strip(line.replace('<item>', ''))}</Text>);
    } else {
      elements.push(<Text key={i} style={ps.para}>{strip(line)}</Text>);
    }
  }

  return (
    <Document>
      <Page size="A4" style={ps.page}>
        <Text style={ps.headerName}>{profile?.name || 'Your Name'}</Text>
        <Text style={ps.headerContact}>
          {[email || profile?.email, profile?.role].filter(Boolean).join(' | ')}
        </Text>
        <View style={ps.rule} />
        <View style={ps.body}>{elements}</View>
      </Page>
    </Document>
  );
}

function strip(s) {
  return s.replace(/<\/?[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

// ── Main component ──
export default function ResumeEditor({ job }) {
  const { profile, setProfile } = useStore();
  const [latexSrc, setLatexSrc] = useState('');
  const [parsed, setParsed] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pdfEmail, setPdfEmail] = useState(profile?.email || '');
  const [view, setView] = useState('editor'); // editor | preview | suggestions
  const [saved, setSaved] = useState(false);

  // On mount: if profile has LaTeX, use it; otherwise show generation prompt
  useEffect(() => {
    const rt = profile?.resume_text || '';
    if (isLatex(rt)) {
      setLatexSrc(rt);
      setParsed(parseLatex(rt));
    } else if (!isGarbageText(rt) && rt.length > 50) {
      // Plain text resume exists — user can generate LaTeX from it
      setLatexSrc('');
    }
  }, []);

  // Re-parse when LaTeX source changes
  const updateLatex = useCallback((src) => {
    setLatexSrc(src);
    if (isLatex(src)) setParsed(parseLatex(src));
  }, []);

  // Generate LaTeX from existing profile/resume using AI
  const generateLatex = async () => {
    setGenerating(true);
    const resumeText = profile?.resume_text || '';
    const src = isGarbageText(resumeText)
      ? `Name: ${profile?.name}\nRole: ${profile?.role}\nExperience: ${profile?.experience} years\nSkills: ${profile?.skills}`
      : resumeText;

    const res = await db.callAI({
      type: 'chat',
      messages: [{
        role: 'user',
        content: `Convert this resume into professional LaTeX code. Use a clean, modern single-column format suitable for tech/engineering roles. Use \\section for main sections, \\textbf for emphasis, \\begin{itemize}/\\item for bullet points, \\href for links.

Output ONLY the complete LaTeX document (from \\documentclass to \\end{document}). No explanations, no markdown fences.

RESUME CONTENT:
${src.slice(0, 6000)}`,
      }],
      profile,
    });
    if (res?.text) {
      const latex = res.text.replace(/^```\w*\n?/, '').replace(/```\s*$/, '').trim();
      updateLatex(latex);
      setView('preview');
    }
    setGenerating(false);
  };

  // Save LaTeX to profile
  const saveToProfile = async () => {
    await db.saveProfile({ resume_text: latexSrc });
    setProfile({ ...profile, resume_text: latexSrc });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Get JD-specific suggestions (output as LaTeX-aware advice)
  const analyze = async () => {
    if (!latexSrc.trim() && !parsed.trim()) {
      setSuggestions('Add your LaTeX resume first — paste it or generate from your profile.');
      return;
    }
    setAnalyzing(true);
    const res = await db.callAI({
      type: 'tailor-resume',
      job: {
        title: job.title,
        company: job.company,
        desc: (job.description || '').slice(0, 1200),
      },
      profile: {
        ...profile,
        resume_text: parsed || latexSrc,
      },
    });
    setSuggestions(res?.text || 'Could not generate suggestions.');
    setAnalyzing(false);
  };

  // Apply suggestions — AI rewrites the LaTeX with suggestions incorporated
  const applySuggestions = async () => {
    setApplying(true);
    const res = await db.callAI({
      type: 'chat',
      messages: [{
        role: 'user',
        content: `You are a LaTeX resume expert. Rewrite the LaTeX resume below by applying the tailoring suggestions. Keep the same facts, dates, and structure — do NOT invent experience. Rephrase and emphasize what's relevant to the target job.

Output ONLY the complete LaTeX document (from \\documentclass to \\end{document}). No markdown fences, no explanations.

CURRENT LATEX RESUME:
${latexSrc.slice(0, 7000)}

SUGGESTIONS TO APPLY:
${suggestions}

TARGET: ${job?.title} at ${job?.company}`,
      }],
      profile,
    });
    if (res?.text) {
      const latex = res.text.replace(/^```\w*\n?/, '').replace(/```\s*$/, '').trim();
      updateLatex(latex);
      setView('preview');
    }
    setApplying(false);
  };

  // Download rendered PDF
  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const finalParsed = isLatex(latexSrc) ? parseLatex(latexSrc) : parsed;
      const blob = await pdf(
        <LatexResumePDF parsed={finalParsed} profile={profile} email={pdfEmail} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Resume_${(job.company || 'company').replace(/\s+/g, '_')}_${(job.title || 'role').replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF generation error:', e);
    }
    setDownloading(false);
  };

  const hasLatex = latexSrc.trim().length > 0;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontFamily: MONO, letterSpacing: 2, color: C.pur }}>RESUME TAILOR</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {!hasLatex && (
            <button onClick={generateLatex} disabled={generating} style={{
              padding: '6px 16px', background: C.pur + '22', border: `1px solid ${C.pur}44`,
              borderRadius: 8, color: C.pur, cursor: generating ? 'wait' : 'pointer',
              fontSize: 12, fontWeight: 600, fontFamily: MONO,
            }}>
              {generating ? 'Generating...' : 'Generate LaTeX from Profile'}
            </button>
          )}
          {hasLatex && (
            <button onClick={analyze} disabled={analyzing} style={{
              padding: '6px 16px', background: 'transparent', border: `1px solid ${C.pur}55`,
              borderRadius: 8, color: C.pur, cursor: analyzing ? 'wait' : 'pointer',
              fontSize: 12, fontWeight: 600, fontFamily: MONO,
            }}>
              {analyzing ? 'Analyzing...' : suggestions ? 'Re-analyze' : 'Get Suggestions'}
            </button>
          )}
        </div>
      </div>

      {/* Email */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: C.t3, fontFamily: MONO, whiteSpace: 'nowrap' }}>EMAIL IN PDF</label>
        <input type="email" value={pdfEmail} onChange={(e) => setPdfEmail(e.target.value)}
          placeholder={profile?.email || 'your@email.com'}
          style={{ flex: 1, padding: '5px 10px', fontSize: 13, background: 'transparent', border: `1px solid ${C.br}`, borderRadius: 6, color: C.t1 }}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.br}` }}>
        {[
          { id: 'editor', label: 'LaTeX Editor' },
          { id: 'preview', label: 'Rendered Preview' },
          { id: 'suggestions', label: 'AI Suggestions' },
        ].map((t) => (
          <button key={t.id} onClick={() => setView(t.id)} style={{
            flex: 1, padding: '8px', border: 'none', fontSize: 11, fontWeight: 700,
            fontFamily: MONO, cursor: 'pointer',
            background: view === t.id ? C.pur + '22' : C.c2,
            color: view === t.id ? C.pur : C.t3,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── LaTeX Editor ── */}
      {view === 'editor' && (
        <>
          {!hasLatex && !generating && (
            <div style={{
              padding: 16, marginBottom: 10, background: C.acc + '15', border: `1px solid ${C.acc}33`,
              borderRadius: 8, fontSize: 12, color: C.acc, lineHeight: 1.6, textAlign: 'center',
            }}>
              <p style={{ marginBottom: 8 }}>Paste your LaTeX resume code below, or click <strong>"Generate LaTeX from Profile"</strong> to create one from your existing resume.</p>
            </div>
          )}
          {generating && (
            <div style={{ textAlign: 'center', padding: 30 }}>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-foreground" style={{ margin: '0 auto' }} />
              <p style={{ color: C.t3, fontSize: 12, marginTop: 10 }}>Generating LaTeX resume from your profile...</p>
            </div>
          )}
          {!generating && (
            <>
              <textarea
                value={latexSrc}
                onChange={(e) => updateLatex(e.target.value)}
                placeholder={'\\documentclass[11pt]{article}\n\\usepackage[margin=0.7in]{geometry}\n\\begin{document}\n\n\\begin{center}\n  {\\LARGE\\textbf{Your Name}}\\\\\n  your@email.com | Your Role\n\\end{center}\n\n\\section*{Experience}\n\\textbf{Senior SRE, Company} \\hfill 2022--Present\n\\begin{itemize}\n  \\item Led migration to Kubernetes...\n\\end{itemize}\n\n\\end{document}'}
                rows={18}
                style={{ resize: 'vertical', lineHeight: 1.4, fontSize: 12, minHeight: 280, fontFamily: MONO }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <p style={{ fontSize: 11, color: C.t3, fontFamily: MONO, margin: 0 }}>
                  {latexSrc.length} chars
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveToProfile} disabled={!hasLatex} style={{
                    padding: '8px 18px', background: 'transparent', border: `1px solid ${saved ? C.grn + '44' : C.br}`,
                    borderRadius: 8, color: saved ? C.grn : C.t2, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: MONO,
                  }}>
                    {saved ? 'Saved!' : 'Save to Profile'}
                  </button>
                  <button onClick={() => { if (hasLatex) { setParsed(parseLatex(latexSrc)); setView('preview'); } }}
                    disabled={!hasLatex} style={{
                    padding: '8px 18px', background: C.grn + '22', border: `1px solid ${C.grn}44`,
                    borderRadius: 8, color: hasLatex ? C.grn : C.t3, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: MONO,
                  }}>
                    Render Preview
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Rendered Preview ── */}
      {view === 'preview' && (
        <>
          {parsed.trim() ? (
            <>
              <LatexPreview html={parsed} profile={profile} email={pdfEmail} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <button onClick={() => setView('editor')} style={{
                  padding: '8px 18px', background: 'transparent', border: `1px solid ${C.br}`,
                  borderRadius: 8, color: C.t2, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: MONO,
                }}>
                  Back to Editor
                </button>
                <button onClick={downloadPDF} disabled={downloading} style={{
                  padding: '8px 18px', background: C.grn + '22', border: `1px solid ${C.grn}44`,
                  borderRadius: 8, color: C.grn, cursor: downloading ? 'wait' : 'pointer',
                  fontSize: 12, fontWeight: 600, fontFamily: MONO,
                }}>
                  {downloading ? 'Creating PDF...' : 'Download as PDF'}
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 20px' }}>
              <p style={{ color: C.t3, fontSize: 13 }}>No LaTeX to render. Add your LaTeX code in the editor or generate from your profile.</p>
              <button onClick={generateLatex} disabled={generating} style={{
                marginTop: 12, padding: '8px 18px', background: C.pur + '22', border: `1px solid ${C.pur}44`,
                borderRadius: 8, color: C.pur, cursor: generating ? 'wait' : 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: MONO,
              }}>
                {generating ? 'Generating...' : 'Generate LaTeX from Profile'}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── AI Suggestions ── */}
      {view === 'suggestions' && (
        <>
          {analyzing ? (
            <div style={{ textAlign: 'center', padding: 30 }}>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-foreground" style={{ margin: '0 auto' }} />
              <p style={{ color: C.t3, fontSize: 12, marginTop: 10 }}>Comparing your resume to this job description...</p>
            </div>
          ) : suggestions ? (
            <>
              <div style={{
                padding: 16, background: C.bg, borderRadius: 10, border: `1px solid ${C.br}`,
                fontSize: 13, lineHeight: 1.8, color: C.t2, whiteSpace: 'pre-wrap',
                maxHeight: 400, overflow: 'auto',
              }}>
                {suggestions}
              </div>
              <button onClick={applySuggestions} disabled={applying} style={{
                marginTop: 10, width: '100%', padding: '10px', background: C.pur + '22',
                border: `1px solid ${C.pur}44`, borderRadius: 8, color: C.pur,
                cursor: applying ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600, fontFamily: MONO,
              }}>
                {applying ? 'Rewriting LaTeX...' : 'Apply Suggestions to LaTeX'}
              </button>
              <p style={{ fontSize: 10, color: C.t3, marginTop: 6, textAlign: 'center' }}>
                AI will rewrite your LaTeX resume with these suggestions applied, then show the rendered preview.
              </p>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 20px' }}>
              <p style={{ color: C.t3, fontSize: 13, lineHeight: 1.6 }}>
                {hasLatex
                  ? `Click "Get Suggestions" to compare your resume against ${job?.title || 'this role'} at ${job?.company || 'this company'}.`
                  : 'Add your LaTeX resume first, then come back for AI suggestions.'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
