import { useState } from 'react';
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { C, MONO } from '../../theme';
import { db } from '../../api';
import useStore from '../../store';
import Spinner from '../ui/Spinner';

// PDF styles for tailored resume
const pdfStyles = StyleSheet.create({
  page: { padding: 50, fontFamily: 'Helvetica', fontSize: 11, color: '#1a1a1a' },
  name: { fontSize: 20, fontWeight: 'bold', fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  contact: { fontSize: 10, color: '#555', marginBottom: 2 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#ddd', marginVertical: 12 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', color: '#333', marginBottom: 6, letterSpacing: 1 },
  body: { fontSize: 11, lineHeight: 1.6 },
  paragraph: { marginBottom: 8 },
});

function ResumePDF({ content, profile }) {
  const sections = content.split('\n\n').filter((s) => s.trim());

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View>
          <Text style={pdfStyles.name}>{profile?.name || 'Your Name'}</Text>
          <Text style={pdfStyles.contact}>{profile?.email || ''}</Text>
          {profile?.role && <Text style={pdfStyles.contact}>{profile.role} &bull; {profile?.experience || ''} years experience</Text>}
          {profile?.skills && <Text style={pdfStyles.contact}>{profile.skills}</Text>}
        </View>
        <View style={pdfStyles.divider} />
        <View style={pdfStyles.body}>
          {sections.map((section, i) => (
            <Text key={i} style={pdfStyles.paragraph}>{section.trim()}</Text>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export default function ResumeEditor({ job }) {
  const { profile } = useStore();
  const [suggestions, setSuggestions] = useState('');
  const [editedResume, setEditedResume] = useState(profile?.resume_text || '');
  const [analyzing, setAnalyzing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [view, setView] = useState('suggestions'); // suggestions | edit

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

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const blob = await pdf(
        <ResumePDF content={editedResume} profile={profile} />
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

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.br}` }}>
        {[
          { id: 'suggestions', label: 'AI Suggestions' },
          { id: 'edit', label: 'Edit Resume' },
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
              <Spinner size={24} color={C.pur} />
              <p style={{ color: C.t3, fontSize: 12, marginTop: 10 }}>
                Analyzing your resume against this job...
              </p>
            </div>
          ) : suggestions ? (
            <div style={{
              padding: 16, background: C.bg, borderRadius: 10, border: `1px solid ${C.br}`,
              fontSize: 13, lineHeight: 1.8, color: C.t2, whiteSpace: 'pre-wrap',
              maxHeight: 500, overflow: 'auto',
            }}>
              {suggestions}
            </div>
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
            placeholder="Paste or edit your resume text here. Apply the AI suggestions, then download as PDF."
            rows={16}
            style={{ resize: 'vertical', lineHeight: 1.6, fontSize: 13, minHeight: 250 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <p style={{ fontSize: 11, color: C.t3, fontFamily: MONO, margin: 0 }}>
              {editedResume.split(/\s+/).filter(Boolean).length} words
            </p>
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
        </>
      )}
    </div>
  );
}
