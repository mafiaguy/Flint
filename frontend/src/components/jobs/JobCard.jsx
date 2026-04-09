import { useState } from 'react';
import { C, MONO, FLAGS, SOURCE_COLORS } from '../../theme';

export default function JobCard({ job, applied, onApply, onMatch, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const days = job.posted ? Math.max(0, Math.floor((Date.now() - new Date(job.posted)) / 864e5)) : null;
  const srcColor = SOURCE_COLORS[job.source] || C.acc;

  return (
    <div style={{
      background: C.c1, border: `1px solid ${applied ? C.grn + "33" : C.br}`,
      borderRadius: 16, padding: compact ? 14 : 18, animation: "up .35s ease", position: "relative",
    }}>
      {applied && (
        <div style={{
          position: "absolute", top: 12, right: 12, background: C.grn + "22", color: C.grn,
          fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 99, fontFamily: MONO,
        }}>
          APPLIED
        </div>
      )}

      <div style={{ display: "flex", gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: srcColor + "15",
          border: `1px solid ${srcColor}33`, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 18, fontWeight: 900, color: srcColor,
          flexShrink: 0, fontFamily: MONO,
        }}>
          {job.company?.charAt(0) || "?"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 5 }}>
            <span style={{ fontSize: 10, fontFamily: MONO, fontWeight: 700, color: srcColor }}>
              {(job.source || "").toUpperCase()}
            </span>
            <span style={{ fontSize: 11, color: C.t3 }}>{FLAGS[job.country] || "\u{1F310}"}</span>
            {job.remote && <span style={{ fontSize: 10, color: C.grn, fontFamily: MONO }}>{"\u{1F30D}"} Remote</span>}
            {days !== null && (
              <span style={{ fontSize: 10, color: C.t3, fontFamily: MONO }}>
                {days === 0 ? "Today" : `${days}d`}
              </span>
            )}
          </div>
          <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: C.t1, lineHeight: 1.3 }}>
            {job.title}
          </h3>
          <p style={{ margin: 0, fontSize: 14, color: C.t2 }}>{job.company}</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: C.t3 }}>{job.location}</p>
          {job.salary && job.salary !== "\u2014" && (
            <p style={{ margin: "6px 0 0", fontSize: 14, fontWeight: 700, color: C.grn, fontFamily: MONO }}>
              {job.salary}
            </p>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{
          marginTop: 14, padding: 14, background: C.bg, borderRadius: 10,
          border: `1px solid ${C.br}`, fontSize: 13, lineHeight: 1.7,
          color: C.t2, maxHeight: 400, overflow: "auto", whiteSpace: "pre-wrap",
        }}>
          {job.description || "No description."}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
        {job.category && (
          <span style={{ fontSize: 10, fontFamily: MONO, color: C.t3, background: C.c2, padding: "4px 10px", borderRadius: 99 }}>
            {job.category}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={() => setExpanded(!expanded)}
          style={{ padding: "7px 14px", fontSize: 12, border: `1px solid ${C.br}`, borderRadius: 8, background: "transparent", color: C.t2, cursor: "pointer" }}>
          {expanded ? "Hide" : "Details"}
        </button>
        <a href={job.url} target="_blank" rel="noreferrer"
          style={{ padding: "7px 14px", fontSize: 12, border: `1px solid ${C.blu}33`, borderRadius: 8, color: C.blu }}>
          Career Page
        </a>
        {onMatch && (
          <button onClick={() => onMatch(job)}
            style={{ padding: "7px 14px", fontSize: 12, border: `1px solid ${C.pur}33`, borderRadius: 8, background: "transparent", color: C.pur, cursor: "pointer", fontWeight: 600 }}>
            Match
          </button>
        )}
        {onApply && (
          <button onClick={() => onApply(job)}
            style={{
              padding: "8px 20px", background: applied ? C.grn + "22" : C.grad,
              color: applied ? C.grn : "#fff", border: "none", borderRadius: 8,
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>
            {applied ? "Applied" : "Apply"}
          </button>
        )}
      </div>
    </div>
  );
}
