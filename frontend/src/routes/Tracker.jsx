import { useState, useMemo } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { db } from '@/api';
import useStore from '@/store';
import { PIPELINE_STAGES } from '@/theme';

function AppCard({ app, isDragging, onUpdateNotes, onInterviewPrep }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(app.notes || '');
  const [editingNotes, setEditingNotes] = useState(false);
  const [prepLoading, setPrepLoading] = useState(false);
  const [prepContent, setPrepContent] = useState(app.prep_content || '');

  const stage = PIPELINE_STAGES.find((s) => s.id === app.status) || PIPELINE_STAGES[0];
  const daysSince = app.stage_updated_at
    ? Math.floor((Date.now() - new Date(app.stage_updated_at)) / 864e5)
    : app.applied_at ? Math.floor((Date.now() - new Date(app.applied_at)) / 864e5) : 0;
  const isStale = daysSince >= 7 && ['applied', 'first_call'].includes(app.status);

  const handlePrep = async () => {
    setPrepLoading(true);
    const res = await onInterviewPrep(app);
    if (res) setPrepContent(res);
    setPrepLoading(false);
  };

  return (
    <Card className={`p-3 ${isDragging ? 'opacity-50' : ''} ${isStale ? 'border-yellow-500/30' : ''} cursor-grab`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">{app.title}</p>
          <p className="text-xs text-muted-foreground">{app.company}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isStale && <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400/30">{daysSince}d</Badge>}
          {app.url && <a href={app.url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline" onClick={(e) => e.stopPropagation()}>Open</a>}
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">{new Date(app.applied_at).toLocaleDateString()}</span>
        {app.source && <Badge variant="secondary" className="text-xs font-normal">{app.source}</Badge>}
      </div>
      <Button variant="ghost" size="sm" className="mt-2 w-full text-xs" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
        {expanded ? 'Close' : 'Details'}
      </Button>
      {expanded && (
        <div className="mt-2 border-t pt-2 space-y-3" onClick={(e) => e.stopPropagation()}>
          <div>
            <label className="text-xs text-muted-foreground">Notes</label>
            {editingNotes ? (
              <div className="mt-1">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Notes..." />
                <div className="mt-1 flex gap-2">
                  <Button size="sm" onClick={() => { onUpdateNotes(app.id, notes); setEditingNotes(false); }}>Save</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setNotes(app.notes || ''); setEditingNotes(false); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div onClick={() => setEditingNotes(true)} className="mt-1 cursor-pointer rounded-md border bg-background p-2 text-sm text-muted-foreground min-h-7">
                {notes || 'Click to add notes...'}
              </div>
            )}
          </div>
          {['interview', 'second_interview'].includes(app.status) && (
            <div>
              <Button variant="outline" size="sm" className="w-full" onClick={handlePrep} disabled={prepLoading}>
                {prepLoading ? 'Generating...' : prepContent ? 'Refresh prep' : 'Generate interview prep'}
              </Button>
              {prepContent && <div className="mt-2 rounded-md border p-2 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap max-h-60 overflow-auto">{prepContent}</div>}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function SortableAppCard(props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.app.id || props.app.job_id, data: { app: props.app } });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} {...attributes} {...listeners}>
      <AppCard {...props} isDragging={isDragging} />
    </div>
  );
}

function PipelineColumn({ stage, apps, onUpdateNotes, onInterviewPrep }) {
  const ids = apps.map((a) => a.id || a.job_id);
  return (
    <div className="flex min-w-[260px] flex-1 flex-col rounded-lg border bg-background" style={{ maxHeight: 'calc(100vh - 160px)' }}>
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        <div className="h-2 w-2 rounded-full" style={{ background: stage.color }} />
        <span className="text-sm font-medium">{stage.label}</span>
        <Badge variant="secondary" className="ml-auto text-xs">{apps.length}</Badge>
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-2">
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {apps.map((app) => <SortableAppCard key={app.id || app.job_id} app={app} onUpdateNotes={onUpdateNotes} onInterviewPrep={onInterviewPrep} />)}
        </SortableContext>
        {apps.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground">Drag cards here</p>}
      </div>
    </div>
  );
}

export default function Tracker() {
  const { applications, updateAppStatus, updateAppNotes, profile } = useStore();
  const [activeId, setActiveId] = useState(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const [viewMode, setViewMode] = useState(isMobile ? 'list' : 'kanban');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const columns = useMemo(() => {
    const grouped = {};
    for (const stage of PIPELINE_STAGES) grouped[stage.id] = applications.filter((a) => a.status === stage.id);
    return grouped;
  }, [applications]);

  const activeStages = PIPELINE_STAGES.filter((s) => (columns[s.id]?.length > 0) || ['applied', 'interview', 'offer', 'not_selected'].includes(s.id));

  const handleDragEnd = (event) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !active) return;
    const draggedApp = active.data?.current?.app;
    if (!draggedApp) return;
    let targetStage = null;
    for (const stage of PIPELINE_STAGES) {
      if ((columns[stage.id] || []).some((a) => (a.id || a.job_id) === over.id)) { targetStage = stage.id; break; }
    }
    if (!targetStage) { const ms = PIPELINE_STAGES.find((s) => s.id === over.id); if (ms) targetStage = ms.id; }
    if (targetStage && targetStage !== draggedApp.status) updateAppStatus(draggedApp.id, targetStage);
  };

  const handleInterviewPrep = async (app) => {
    const res = await db.callAI({ type: 'interview-prep', job: { title: app.title, company: app.company, location: app.location, desc: '' }, profile });
    return res?.text || null;
  };

  const activeApp = activeId ? applications.find((a) => (a.id || a.job_id) === activeId) : null;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-lg font-semibold">Tracker</h1>
        {applications.length > 0 && <span className="text-sm text-muted-foreground">{applications.length} applications</span>}
        <div className="flex-1" />
        <div className="flex rounded-lg border overflow-hidden">
          {['kanban', 'list'].map((m) => (
            <Button key={m} variant={viewMode === m ? 'secondary' : 'ghost'} size="sm" className="rounded-none" onClick={() => setViewMode(m)}>
              {m === 'kanban' ? 'Board' : 'List'}
            </Button>
          ))}
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="py-20 text-center">
          <h3 className="text-base font-medium">No applications yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">When you mark jobs as applied, they'll show up here.</p>
        </div>
      ) : viewMode === 'kanban' ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveId(e.active.id)} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 300 }}>
            {activeStages.map((stage) => <PipelineColumn key={stage.id} stage={stage} apps={columns[stage.id] || []} onUpdateNotes={updateAppNotes} onInterviewPrep={handleInterviewPrep} />)}
          </div>
          <DragOverlay>{activeApp ? <div className="rotate-1 opacity-90"><AppCard app={activeApp} isDragging={false} onUpdateNotes={() => {}} onInterviewPrep={() => {}} /></div> : null}</DragOverlay>
        </DndContext>
      ) : (
        <div className="space-y-6">
          {PIPELINE_STAGES.map((stage) => {
            const apps = columns[stage.id] || [];
            if (apps.length === 0) return null;
            return (
              <div key={stage.id}>
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ background: stage.color }} />
                  <span className="text-sm font-medium">{stage.label}</span>
                  <span className="text-xs text-muted-foreground">({apps.length})</span>
                </div>
                <div className="space-y-2">
                  {apps.map((app) => <AppCard key={app.id || app.job_id} app={app} isDragging={false} onUpdateNotes={updateAppNotes} onInterviewPrep={handleInterviewPrep} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
