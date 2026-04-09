import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { db } from '@/api';
import useStore from '@/store';
import { FLAGS, CATS } from '@/theme';

const QUICK = ['Site Reliability Engineer', 'Platform Engineer', 'Cloud Security', 'DevSecOps', 'DevOps', 'Infrastructure'];

function JobCard({ job, applied, onApply, onMatch }) {
  const [expanded, setExpanded] = useState(false);
  const days = job.posted ? Math.max(0, Math.floor((Date.now() - new Date(job.posted)) / 864e5)) : null;

  return (
    <Card className="p-4">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted font-mono text-sm font-bold">
          {job.company?.charAt(0) || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">{job.source}</Badge>
            <span className="text-xs text-muted-foreground">{FLAGS[job.country] || '\u{1F310}'}</span>
            {job.remote && <span className="text-xs text-muted-foreground">Remote</span>}
            {days !== null && <span className="text-xs text-muted-foreground">{days === 0 ? 'Today' : `${days}d`}</span>}
            {applied && <Badge variant="secondary" className="text-xs">Applied</Badge>}
          </div>
          <h3 className="text-sm font-semibold">{job.title}</h3>
          <p className="text-sm text-muted-foreground">{job.company} &middot; {job.location}</p>
          {job.salary && job.salary !== '\u2014' && (
            <p className="mt-1 font-mono text-sm text-green-400">{job.salary}</p>
          )}
        </div>
      </div>
      {expanded && (
        <div className="mt-3 rounded-lg border bg-background p-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap max-h-80 overflow-auto">
          {job.description || 'No description.'}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {job.category && <Badge variant="secondary" className="text-xs font-normal">{job.category}</Badge>}
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>{expanded ? 'Hide' : 'Details'}</Button>
        <Button variant="ghost" size="sm" asChild><a href={job.url} target="_blank" rel="noreferrer">Career Page</a></Button>
        {onMatch && <Button variant="outline" size="sm" onClick={() => onMatch(job)}>Match</Button>}
        {onApply && <Button size="sm" onClick={() => onApply(job)}>{applied ? 'Applied' : 'Apply'}</Button>}
      </div>
    </Card>
  );
}

export default function Browse() {
  const { jobs, setJobs, profile, applications, addApplication } = useStore();
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [selCountries, setSelCountries] = useState([]);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  const appliedIds = new Set(applications.map((a) => a.job_id));

  const doSearch = async () => {
    setLoading(true);
    const [cached, live] = await Promise.all([db.getJobs(search, cat), db.liveSearch(search)]);
    const all = [...(cached || []), ...(live?.jobs || [])];
    const seen = new Set();
    const unique = all.filter((j) => {
      const k = (j.title + j.company).toLowerCase().replace(/\W/g, '');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    unique.sort((a, b) => new Date(b.posted || 0) - new Date(a.posted || 0));
    setJobs(unique);
    setLoading(false);
  };

  const handleApply = async (job) => {
    window.open(job.url, '_blank');
    await addApplication(job);
  };

  const filtered = jobs.filter((j) => {
    const mc = cat === 'All' || (j.category || '').toLowerCase().includes(cat.toLowerCase());
    const ms = !search || [j.title, j.company, j.location].join(' ').toLowerCase().includes(search.toLowerCase());
    const mr = !remoteOnly || j.remote;
    const ml = selCountries.length === 0 || selCountries.includes(j.country);
    return mc && ms && mr && ml;
  });

  return (
    <div>
      <div className="mb-6 flex gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs..."
          onKeyDown={(e) => e.key === 'Enter' && doSearch()} className="flex-1" />
        <Button variant="outline" onClick={doSearch} disabled={loading}>
          {loading ? '...' : 'Search'}
        </Button>
      </div>

      {/* Quick filters */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {QUICK.map((p) => (
          <Button key={p} variant={search === p ? 'secondary' : 'ghost'} size="sm" onClick={() => setSearch(p)}>{p}</Button>
        ))}
      </div>

      {/* Categories */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {CATS.map((c) => (
          <Button key={c} variant={cat === c ? 'secondary' : 'ghost'} size="sm" onClick={() => setCat(c)}>{c}</Button>
        ))}
      </div>

      {/* Region + remote */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground mr-1">Region:</span>
        {Object.entries(FLAGS).filter(([k]) => k !== 'other').map(([cc, flag]) => (
          <Button key={cc} variant={selCountries.includes(cc) ? 'secondary' : 'ghost'} size="sm"
            onClick={() => setSelCountries((p) => p.includes(cc) ? p.filter((c) => c !== cc) : [...p, cc])}>
            {flag} {cc.toUpperCase()}
          </Button>
        ))}
        <Button variant={remoteOnly ? 'secondary' : 'ghost'} size="sm" onClick={() => setRemoteOnly((p) => !p)}>
          Remote{remoteOnly ? ' \u2713' : ''}
        </Button>
      </div>

      {loading && <div className="h-0.5 w-full overflow-hidden rounded bg-muted mb-4"><div className="h-full w-1/3 animate-pulse bg-foreground/20 rounded" /></div>}

      <p className="mb-4 text-xs text-muted-foreground">{jobs.length} jobs &middot; {filtered.length} showing</p>

      <div className="flex flex-col gap-3">
        {filtered.map((j) => (
          <JobCard key={j.id} job={j} applied={appliedIds.has(j.id)} onApply={handleApply} onMatch={null} />
        ))}
      </div>
    </div>
  );
}
