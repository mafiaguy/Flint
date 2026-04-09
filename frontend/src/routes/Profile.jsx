import { useState } from 'react';
import { C, MONO } from '../theme';
import { db } from '../api';
import useStore from '../store';
import Spinner from '../components/ui/Spinner';

function SalaryChart({ data }) {
  if (!data || data.sample_size < 3) return null;
  const max = data.max || data.percentile_75 * 1.2;
  const fmt = (n) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${Math.round(n / 1000)}K`;
    return String(n);
  };
  const bars = [
    { label: '25th', value: data.percentile_25, color: C.acc },
    { label: 'Median', value: data.median, color: C.grn },
    { label: '75th', value: data.percentile_75, color: C.blu },
  ];
  return (
    <div style={{ marginTop: 12 }}>
      {bars.map((b) => (
        <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ width: 50, fontSize: 12, color: C.t3, textAlign: 'right' }}>{b.label}</span>
          <div style={{ flex: 1, height: 24, background: C.c2, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${Math.min((b.value / max) * 100, 100)}%`,
              background: b.color + '33', borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 8,
            }}>
              <span style={{ fontSize: 12, fontFamily: MONO, fontWeight: 600, color: b.color }}>{data.currency} {fmt(b.value)}</span>
            </div>
          </div>
        </div>
      ))}
      <p style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>Based on {data.sample_size} listings, last 90 days</p>
    </div>
  );
}

export default function Profile() {
  const { profile, setProfile, matches, qa, addQA, deleteQA } = useStore();
  const [newQ, setNewQ] = useState('');
  const [newA, setNewA] = useState('');
  const [activeSection, setActiveSection] = useState('profile');
  const [skillGap, setSkillGap] = useState('');
  const [skillLoading, setSkillLoading] = useState(false);
  const [salary, setSalary] = useState(null);
  const [salaryLoading, setSalaryLoading] = useState(false);

  const handleFieldChange = (key, value) => {
    setProfile({ ...profile, [key]: value });
    db.saveProfile({ [key]: value });
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await db.uploadResume(file);
    if (url) { setProfile({ ...profile, resume_url: url }); db.parseResume(url); }
  };

  const handleAddQA = async () => {
    if (!newQ.trim() || !newA.trim()) return;
    await addQA(newQ.trim(), newA.trim());
    setNewQ(''); setNewA('');
  };

  const analyzeSkillGap = async () => {
    setSkillLoading(true);
    const gapSummary = (matches || []).filter((m) => m.gaps?.length > 0).flatMap((m) => m.gaps)
      .reduce((acc, gap) => { acc[gap] = (acc[gap] || 0) + 1; return acc; }, {});
    const gapList = Object.entries(gapSummary).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([gap, count]) => `${gap} (${count} matches)`).join('\n');
    const res = await db.callAI({ type: 'skill-gap', prompt: gapList || 'Analyze based on profile.', profile });
    setSkillGap(res?.text || 'Could not generate analysis.');
    setSkillLoading(false);
  };

  const loadSalary = async () => {
    setSalaryLoading(true);
    const roleMap = { sre: 'SRE', platform: 'Platform', devops: 'DevOps', backend: 'Backend', frontend: 'Frontend', fullstack: 'Fullstack', data: 'Data', security: 'Security', cloud: 'Cloud', infrastructure: 'Infrastructure', ml: 'ML/AI', ai: 'ML/AI' };
    const role = (profile?.role || '').toLowerCase();
    let category = 'Engineering';
    for (const [key, val] of Object.entries(roleMap)) { if (role.includes(key)) { category = val; break; } }
    const data = await db.salaryInsights(category, profile?.preferred_regions?.[0] || null);
    setSalary(data);
    setSalaryLoading(false);
  };

  const fields = [
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Target role', placeholder: 'Senior SRE' },
    { key: 'experience', label: 'Experience (years)', placeholder: '5' },
    { key: 'skills', label: 'Key skills', placeholder: 'AWS, K8s, Python, Go' },
    { key: 'notice', label: 'Notice period', placeholder: '30 days' },
    { key: 'compensation', label: 'Current compensation', placeholder: '25 LPA' },
    { key: 'expected', label: 'Expected compensation', placeholder: '65-90 LPA' },
    { key: 'visa', label: 'Work authorization', placeholder: 'No visa needed' },
    { key: 'work_mode', label: 'Work mode', placeholder: 'Remote' },
  ];

  return (
    <div>
      <h2 style={{ color: C.t1, fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Profile</h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {[{ id: 'profile', label: 'Details' }, { id: 'skills', label: 'Skill gap' }, { id: 'salary', label: 'Salary' }].map((t) => (
          <button key={t.id} onClick={() => setActiveSection(t.id)} style={{
            padding: '6px 14px', border: `1px solid ${activeSection === t.id ? C.br : 'transparent'}`,
            borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            background: activeSection === t.id ? C.c1 : 'transparent', color: activeSection === t.id ? C.t1 : C.t3,
          }}>{t.label}</button>
        ))}
      </div>

      {/* Profile section */}
      {activeSection === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
          {/* Left column: form fields */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: C.t2, marginBottom: 16 }}>Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {fields.map(({ key, label, placeholder }) => (
                <div key={key} style={{ gridColumn: key === 'skills' ? '1 / -1' : undefined }}>
                  <label style={{ fontSize: 12, color: C.t3, display: 'block', marginBottom: 4 }}>{label}</label>
                  <input value={profile?.[key] || ''} onChange={(e) => handleFieldChange(key, e.target.value)} placeholder={placeholder} />
                </div>
              ))}
            </div>
          </div>

          {/* Right column: resume + Q&A */}
          <div>
            {/* Resume */}
            <h3 style={{ fontSize: 14, fontWeight: 600, color: C.t2, marginBottom: 16 }}>Resume</h3>
            <div style={{
              background: C.c1, border: `1px solid ${profile?.resume_url ? C.grn + '33' : C.br}`,
              borderRadius: 10, padding: 16, marginBottom: 24,
            }}>
              <p style={{ color: C.t3, fontSize: 13, marginBottom: 10 }}>
                {profile?.resume_url ? 'Resume uploaded. Re-upload to replace.' : 'Upload for AI matching and tailoring.'}
              </p>
              <input type="file" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} style={{ fontSize: 13 }} />
              {profile?.resume_url && (
                <p style={{ fontSize: 12, color: C.grn, marginTop: 8 }}>{profile.resume_url.split('/').pop()}</p>
              )}
            </div>

            {/* Q&A */}
            <h3 style={{ fontSize: 14, fontWeight: 600, color: C.t2, marginBottom: 12 }}>Saved Q&A ({qa.length})</h3>
            {qa.map((q) => (
              <div key={q.id} style={{
                background: C.c1, border: `1px solid ${C.br}`, borderRadius: 8, padding: 12,
                marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 8,
              }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 12, color: C.t3, margin: 0 }}>{q.question}</p>
                  <p style={{ fontSize: 13, color: C.t1, margin: '3px 0 0' }}>{q.answer}</p>
                </div>
                <button onClick={() => deleteQA(q.id)}
                  style={{ background: 'none', border: 'none', color: C.t3, cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>&times;</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input value={newQ} onChange={(e) => setNewQ(e.target.value)} placeholder="Question" style={{ flex: 1 }} />
              <input value={newA} onChange={(e) => setNewA(e.target.value)} placeholder="Answer" style={{ flex: 1 }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddQA()} />
              <button onClick={handleAddQA} disabled={!newQ.trim() || !newA.trim()}
                style={{ padding: '8px 14px', background: C.c1, color: C.t1, border: `1px solid ${C.br}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skill gap */}
      {activeSection === 'skills' && (
        <div style={{ maxWidth: 700 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: C.t3, margin: 0 }}>Based on {matches?.length || 0} job matches</p>
            <button onClick={analyzeSkillGap} disabled={skillLoading} style={{
              padding: '8px 16px', background: C.c1, border: `1px solid ${C.br}`, borderRadius: 8,
              color: C.t1, cursor: skillLoading ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600,
            }}>{skillLoading ? 'Analyzing...' : skillGap ? 'Re-analyze' : 'Analyze gaps'}</button>
          </div>
          {skillLoading && <div style={{ textAlign: 'center', padding: 40 }}><Spinner size={24} color={C.t3} /></div>}
          {!skillLoading && skillGap ? (
            <div style={{ padding: 20, background: C.c1, borderRadius: 10, border: `1px solid ${C.br}`, fontSize: 14, lineHeight: 1.8, color: C.t2, whiteSpace: 'pre-wrap' }}>{skillGap}</div>
          ) : !skillLoading && (
            <p style={{ color: C.t3, fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
              Click "Analyze gaps" to see what skills to develop.{(!matches || matches.length === 0) && ' Run some matches first.'}
            </p>
          )}
        </div>
      )}

      {/* Salary */}
      {activeSection === 'salary' && (
        <div style={{ maxWidth: 700 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: C.t3, margin: 0 }}>Market rates for {profile?.role || 'your role'}</p>
            <button onClick={loadSalary} disabled={salaryLoading} style={{
              padding: '8px 16px', background: C.c1, border: `1px solid ${C.br}`, borderRadius: 8,
              color: C.t1, cursor: salaryLoading ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600,
            }}>{salaryLoading ? 'Loading...' : salary ? 'Refresh' : 'Load insights'}</button>
          </div>
          {salaryLoading && <div style={{ textAlign: 'center', padding: 40 }}><Spinner size={24} color={C.t3} /></div>}
          {!salaryLoading && salary && salary.sample_size >= 3 ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                {[{ label: 'Low (25th)', value: salary.percentile_25, color: C.t2 }, { label: 'Median', value: salary.median, color: C.grn }, { label: 'High (75th)', value: salary.percentile_75, color: C.t1 }].map((s) => (
                  <div key={s.label} style={{ background: C.c1, border: `1px solid ${C.br}`, borderRadius: 8, padding: 16 }}>
                    <div style={{ fontSize: 12, color: C.t3, marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: MONO, color: s.color }}>
                      {salary.currency} {s.value >= 1000 ? `${Math.round(s.value / 1000)}K` : s.value}
                    </div>
                  </div>
                ))}
              </div>
              <SalaryChart data={salary} />
            </>
          ) : !salaryLoading && (
            <p style={{ color: C.t3, fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
              {salary ? 'Not enough salary data for this role/region.' : 'Click "Load insights" to see market salary data.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
