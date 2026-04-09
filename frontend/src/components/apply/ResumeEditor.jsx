import { useState } from 'react';
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { C, MONO } from '../../theme';
import { db } from '../../api';
import useStore from '../../store';

// PDF styles for tailored resume
const pdfStyles = StyleSheet.create({
  page: { padding: 50, fontFamily: 'Helvetica', fontSize: 11, color: '#1a1a1a' },
  name: { fontSize: 20, fontWeight: 'bold', fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  contact: { fontSize: 10, color: '#555', marginBottom: 2 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#ddd', marginVertical: 12 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', color: '#333', marginBottom: 6, letterSpacing: 1 },
  body: { fontSize: 11, lineHeight: 1.6 },
  paragraph: { marginBottom: 8 },
  bullet: { fontSize: 11, lineHeight: 1.6, marginBottom: 4, paddingLeft: 12 },
});

function ResumePDF({ content, profile }) {
  const lines = content.split('\n');
  const elements = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Section headers (ALL CAPS or ends with :)
    if (/^[A-Z][A-Z\s&/]+:?$/.test(line) || /^#{1,3}\s/.test(line)) {
      elements.push(
        <View key={i} style={{ marginTop: elements.length > 0 ? 10 : 0 }}>
          <Text style={pdfStyles.sectionTitle}>{line.replace(/^#+\s*/, '').replace(/:$/, '')}</Text>
        </View>
      );
    } else if (/^[-•*]\s/.test(line)) {
      elements.push(
        <Text key={i} style={pdfStyles.bullet}>{'\u2022 '}{line.replace(/^[-•*]\s*/, '')}</Text>
      );
    } else {
      elements.push(
        <Text key={i} style={pdfStyles.paragraph}>{line}</Text>
      );
    }
  }

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View>
          <Text style={pdfStyles.name}>{profile?.name || 'Your Name'}</Text>
          <Text style={pdfStyles.contact}>{profile?.email || ''}</Text>
          {profile?.role && <Text style={pdfStyles.contact}>{profile.role} {'\u2022'} {profile?.experience || ''} years experience</Text>}
          {profile?.skills && <Text style={pdfStyles.contact}>{profile.skills}</Text>}
        </View>
        <View style={pdfStyles.divider} />
        <View style={pdfStyles.body}>{elements}</View>
      </Page>
    </Document>
  );
}

// HTML preview that mirrors the PDF layout
function ResumePreview({ content, profile }) {
  const lines = content.split('\n');

  const renderLines = () => {
    const elements = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) { elements.push(<div key={i} style={{ height: 8 }} />); continue; }

      if (/^[A-Z][A-Z\s&/]+:?$/.test(line) || /^#{1,3}\s/.test(line)) {
        elements.push(
          <div key={i} style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#ddd', letterSpacing: 1, marginTop: 12, marginBottom: 4 }}>
            {line.replace(/^#+\s*/, '').replace(/:$/, '')}
          </div>
        );
      } else if (/^[-•*]\s/.test(line)) {
        elements.push(
          <div key={i} style={{ fontSize: 11, lineHeight: 1.6, paddingLeft: 14, color: '#bbb' }}>
            {'\u2022 '}{line.replace(/^[-•*]\s*/, '')}
          </div>
        );
      } else {
        elements.push(
          <div key={i} style={{ fontSize: 11, lineHeight: 1.6, marginBottom: 4, color: '#bbb' }}>{line}</div>
        );
      }
    }
    return elements;
  };

  return (
    <div style={{
      background: '#111', border: `1px solid ${C.br}`, borderRadius: 10,
      padding: 32, maxHeight: 500, overflow: 'auto', fontFamily: 'Helvetica, Arial, sans-serif',
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{profile?.name || 'Your Name'}</div>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>{profile?.email || ''}</div>
      {profile?.role && <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>{profile.role} &bull; {profile?.experience || ''} years experience</div>}
      {profile?.skills && <div style={{ fontSize: 10, color: '#888' }}>{profile.skills}</div>}
      <div style={{ borderBottom: '1px solid #333', margin: '12px 0' }} />
      {renderLines()}
    </div>
  );
}

export default function ResumeEditor({ job }) {
  const { profile } = useStore();
  const [suggestions, setSuggestions] = useState('');
  const [editedResume, setEditedResume] = useState(profile?.resume_text || '');
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pdfEmail, setPdfEmail] = useState(profile?.email || '');
  const [view, setView] = useState('suggestions'); // suggestions | edit | preview

  const analyze = async () => {
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
        resume_text: profile?.resume_text || '',
      },
    });
    setSuggestions(res?.text || 'Could not generate suggestions. Please try again.');
    setAnalyzing(false);
  };

  const applySuggestions = async () => {
    setApplying(true);
    const res = await db.callAI({
      type: 'chat',
      messages: [{
        role: 'user',
        content: `Rewrite this resume incorporating the tailoring suggestions below. Output ONLY the final resume text — no explanations, no markdown fences, no commentary. Use plain text with section headers in ALL CAPS, bullet points with "- ", and blank lines between sections.

CURRENT RESUME:
${editedResume || profile?.resume_text || ''}

SUGGESTIONS TO APPLY:
${suggestions}

JOB TARGET: ${job?.title} at ${job?.company}`,
      }],
      profile,
    });
    if (res?.text) {
      setEditedResume(res.text);
      setView('edit');
    }
    setApplying(false);
  };

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const pdfProfile = { ...profile, email: pdfEmail || profile?.email };
      const blob = await pdf(
        <ResumePDF content={editedResume} profile={pdfProfile} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Resume_Tailored_${(job.company || 'company').replace(/\s+/g, '_')}_${(job.title || 'role').replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF generation error:', e);
    }
    setDownloading(false);
  };

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontFamily: MONO, letterSpacing: 2, color: C.pur }}>RESUME TAILOR</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={analyze}
            disabled={analyzing}
            style={{
              padding: '6px 16px', background: 'transparent', border: `1px solid ${C.pur}55`,
              borderRadius: 8, color: C.pur, cursor: analyzing ? 'wait' : 'pointer',
              fontSize: 12, fontWeight: 600, fontFamily: MONO,
            }}
          >
            {analyzing ? 'Analyzing...' : suggestions ? 'Re-analyze' : 'Get Suggestions'}
          </button>
        </div>
      </div>

      {/* Email for PDF */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: C.t3, fontFamily: MONO, whiteSpace: 'nowrap' }}>EMAIL IN PDF</label>
        <input
          type="email"
          value={pdfEmail}
          onChange={(e) => setPdfEmail(e.target.value)}
          placeholder={profile?.email || 'your@email.com'}
          style={{
            flex: 1, padding: '5px 10px', fontSize: 13,
            background: 'transparent', border: `1px solid ${C.br}`,
            borderRadius: 6, color: C.t1,
          }}
        />
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.br}` }}>
        {[
          { id: 'suggestions', label: 'AI Suggestions' },
          { id: 'edit', label: 'Edit Resume' },
          { id: 'preview', label: 'Preview' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            style={{
              flex: 1, padding: '8px', border: 'none', fontSize: 11, fontWeight: 700,
              fontFamily: MONO, cursor: 'pointer',
              background: view === t.id ? C.pur + '22' : C.c2,
              color: view === t.id ? C.pur : C.t3,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Suggestions view */}
      {view === 'suggestions' && (
        <>
          {analyzing ? (
            <div style={{ textAlign: 'center', padding: 30 }}>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-foreground" />
              <p style={{ color: C.t3, fontSize: 12, marginTop: 10 }}>
                Analyzing your resume against this job...
              </p>
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
              <button
                onClick={applySuggestions}
                disabled={applying}
                style={{
                  marginTop: 10, width: '100%', padding: '10px', background: C.pur + '22',
                  border: `1px solid ${C.pur}44`, borderRadius: 8, color: C.pur,
                  cursor: applying ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600, fontFamily: MONO,
                }}
              >
                {applying ? 'Applying suggestions...' : 'Apply Suggestions to Resume'}
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 20px' }}>
              <p style={{ color: C.t3, fontSize: 13, lineHeight: 1.6 }}>
                Click "Get Suggestions" to see how to tailor your resume for this role.
              </p>
              {!profile?.resume_text && (
                <p style={{ color: C.acc, fontSize: 12, marginTop: 8 }}>
                  Upload your resume in Profile for better suggestions.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Edit view */}
      {view === 'edit' && (
        <>
          <textarea
            value={editedResume}
            onChange={(e) => setEditedResume(e.target.value)}
            placeholder="Paste or edit your resume text here. Use ALL CAPS for section headers, - for bullets."
            rows={16}
            style={{ resize: 'vertical', lineHeight: 1.6, fontSize: 13, minHeight: 250 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <p style={{ fontSize: 11, color: C.t3, fontFamily: MONO, margin: 0 }}>
              {editedResume.split(/\s+/).filter(Boolean).length} words
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setView('preview')}
                style={{
                  padding: '8px 18px', background: 'transparent', border: `1px solid ${C.br}`,
                  borderRadius: 8, color: C.t2, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: MONO,
                }}
              >
                Preview
              </button>
              <button
                onClick={downloadPDF}
                disabled={downloading || !editedResume.trim()}
                style={{
                  padding: '8px 18px', background: C.grn + '22', border: `1px solid ${C.grn}44`,
                  borderRadius: 8, color: C.grn, cursor: downloading ? 'wait' : 'pointer',
                  fontSize: 12, fontWeight: 600, fontFamily: MONO,
                }}
              >
                {downloading ? 'Creating PDF...' : 'Download as PDF'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Preview view */}
      {view === 'preview' && (
        <>
          {editedResume.trim() ? (
            <>
              <ResumePreview content={editedResume} profile={{ ...profile, email: pdfEmail || profile?.email }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button
                  onClick={() => setView('edit')}
                  style={{
                    padding: '8px 18px', background: 'transparent', border: `1px solid ${C.br}`,
                    borderRadius: 8, color: C.t2, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: MONO,
                  }}
                >
                  Back to Edit
                </button>
                <button
                  onClick={downloadPDF}
                  disabled={downloading}
                  style={{
                    padding: '8px 18px', background: C.grn + '22', border: `1px solid ${C.grn}44`,
                    borderRadius: 8, color: C.grn, cursor: downloading ? 'wait' : 'pointer',
                    fontSize: 12, fontWeight: 600, fontFamily: MONO,
                  }}
                >
                  {downloading ? 'Creating PDF...' : 'Download as PDF'}
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 20px' }}>
              <p style={{ color: C.t3, fontSize: 13 }}>No resume content to preview. Switch to Edit to add text.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
