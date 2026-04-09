import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { db } from '@/api';
import useStore from '@/store';

export default function Profile() {
  const { profile, setProfile, matches, qa, addQA, deleteQA } = useStore();
  const [newQ, setNewQ] = useState('');
  const [newA, setNewA] = useState('');
  const [activeSection, setActiveSection] = useState('profile');
  const [skillGap, setSkillGap] = useState('');
  const [skillLoading, setSkillLoading] = useState(false);
  const [salary, setSalary] = useState(null);
  const [salaryLoading, setSalaryLoading] = useState(false);

  const saveTimerRef = useRef(null);
  const handleFieldChange = useCallback((key, value) => {
    setProfile({ ...profile, [key]: value });
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => db.saveProfile({ [key]: value }), 800);
  }, [profile, setProfile]);

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await db.uploadResume(file);
    if (url) { setProfile({ ...profile, resume_url: url }); db.parseResume(url); }
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
    const roleMap = { sre: 'SRE', platform: 'Platform', devops: 'DevOps', backend: 'Backend', frontend: 'Frontend', fullstack: 'Fullstack', data: 'Data', security: 'Security', cloud: 'Cloud' };
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
    { key: 'skills', label: 'Key skills', placeholder: 'AWS, K8s, Python, Go', wide: true },
    { key: 'notice', label: 'Notice period', placeholder: '30 days' },
    { key: 'compensation', label: 'Current comp', placeholder: '25 LPA' },
    { key: 'expected', label: 'Expected comp', placeholder: '65-90 LPA' },
    { key: 'visa', label: 'Work auth', placeholder: 'No visa needed' },
    { key: 'work_mode', label: 'Work mode', placeholder: 'Remote' },
  ];

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6 flex gap-1.5">
        {[{ id: 'profile', label: 'Details' }, { id: 'skills', label: 'Skill gap' }, { id: 'salary', label: 'Salary' }].map((t) => (
          <Button key={t.id} variant={activeSection === t.id ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveSection(t.id)}>
            {t.label}
          </Button>
        ))}
      </div>

      {activeSection === 'profile' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: form */}
          <div>
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">Details</h3>
            <div className="grid grid-cols-2 gap-3">
              {fields.map(({ key, label, placeholder, wide }) => (
                <div key={key} className={wide ? 'col-span-2' : ''}>
                  <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
                  <Input value={profile?.[key] || ''} onChange={(e) => handleFieldChange(key, e.target.value)} placeholder={placeholder} />
                </div>
              ))}
            </div>
          </div>

          {/* Right: resume + Q&A */}
          <div>
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">Resume</h3>
            <Card className={`mb-6 p-4 ${profile?.resume_url ? 'border-green-500/30' : ''}`}>
              <p className="mb-2 text-sm text-muted-foreground">
                {profile?.resume_url ? 'Resume uploaded. Re-upload to replace.' : 'Upload for AI matching.'}
              </p>
              <input type="file" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} className="text-sm" />
              {profile?.resume_url && <p className="mt-2 text-xs text-green-400">{profile.resume_url.split('/').pop()}</p>}
            </Card>

            <h3 className="mb-3 text-sm font-medium text-muted-foreground">Saved Q&A ({qa.length})</h3>
            <div className="space-y-2">
              {qa.map((q) => (
                <Card key={q.id} className="flex items-start justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{q.question}</p>
                    <p className="mt-0.5 text-sm">{q.answer}</p>
                  </div>
                  <button onClick={() => deleteQA(q.id)} className="shrink-0 text-muted-foreground hover:text-foreground">&times;</button>
                </Card>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input value={newQ} onChange={(e) => setNewQ(e.target.value)} placeholder="Question" className="flex-1" />
              <Input value={newA} onChange={(e) => setNewA(e.target.value)} placeholder="Answer" className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && newQ && newA && (addQA(newQ, newA), setNewQ(''), setNewA(''))} />
              <Button variant="outline" size="sm" onClick={() => { if (newQ && newA) { addQA(newQ, newA); setNewQ(''); setNewA(''); } }}>Add</Button>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'skills' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Based on {matches?.length || 0} job matches</p>
            <Button variant="outline" size="sm" onClick={analyzeSkillGap} disabled={skillLoading}>
              {skillLoading ? 'Analyzing...' : skillGap ? 'Re-analyze' : 'Analyze gaps'}
            </Button>
          </div>
          {skillLoading ? (
            <div className="flex justify-center p-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" /></div>
          ) : skillGap ? (
            <Card className="p-5 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{skillGap}</Card>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">Click "Analyze gaps" to see what skills to develop.</p>
          )}
        </div>
      )}

      {activeSection === 'salary' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Market rates for {profile?.role || 'your role'}</p>
            <Button variant="outline" size="sm" onClick={loadSalary} disabled={salaryLoading}>
              {salaryLoading ? 'Loading...' : salary ? 'Refresh' : 'Load insights'}
            </Button>
          </div>
          {salaryLoading ? (
            <div className="flex justify-center p-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" /></div>
          ) : salary && salary.sample_size >= 3 ? (
            <div className="grid grid-cols-3 gap-3">
              {[{ label: 'Low (25th)', value: salary.percentile_25 }, { label: 'Median', value: salary.median }, { label: 'High (75th)', value: salary.percentile_75 }].map((s) => (
                <Card key={s.label} className="p-4">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="mt-1 font-mono text-xl font-bold">{salary.currency} {s.value >= 1000 ? `${Math.round(s.value / 1000)}K` : s.value}</p>
                </Card>
              ))}
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              {salary ? 'Not enough salary data.' : 'Click "Load insights" to see market data.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
