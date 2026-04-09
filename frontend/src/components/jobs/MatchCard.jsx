import { useNavigate } from 'react-router-dom';
import { C, MONO, FLAGS, SOURCE_COLORS } from '../../theme';

function ScoreBadge({ score }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? C.grn : pct >= 60 ? C.acc : C.red;
  return (
    <div style={{
      width: 52, height: 52, borderRadius: 14, border: `2px solid ${color}44`,
      background: color + "11", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <span style={{ fontSize: 18, fontWeight: 900, color, fontFamily: MONO }}>{pct}</span>
      <span style={{ fontSize: 8, color: color + "99", fontFamily: MONO }}>MATCH</span>
    </div>
  );
}

export default function MatchCard({ match }) {
  const navigate = useNavigate();
  const job = match.jobs || {};
  const srcColor = SOURCE_COLORS[job.source] || C.acc;
  const days = job.posted ? Math.max(0, Math.floor((Date.now() - new Date(job.posted)) / 864e5)) : null;

  const verdictColor = match.verdict === "apply" ? C.grn : match.verdict === "stretch" ? C.acc : C.red;
  const verdictLabel = match.verdict === "apply" ? "Strong Fit" : match.verdict === "stretch" ? "Worth a Shot" : "Stretch";

  return (
    <div
      onClick={() => navigate(`/job/${encodeURIComponent(job.id)}`)}
      style={{
        background: C.c1, border: `1px solid ${C.br}`, borderRadius: 16, padding: 18,
        cursor: "pointer", animation: "up .35s ease", transition: "border-color .15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.acc + "44")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.br)}
    >
      <div style={{ display: "flex", gap: 14 }}>
        <ScoreBadge score={match.score} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
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
            <span style={{
              fontSize: 10, fontFamily: MONO, fontWeight: 700, color: verdictColor,
              background: verdictColor + "15", padding: "2px 8px", borderRadius: 99, marginLeft: "auto",
            }}>
              {verdictLabel}
            </span>
          </div>
          <h3 style={{ margin: "0 0 3px", fontSize: 16, fontWeight: 700, color: C.t1, lineHeight: 1.3 }}>
            {job.title}
          </h3>
          <p style={{ margin: 0, fontSize: 14, color: C.t2 }}>{job.company}</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: C.t3 }}>{job.location}</p>
        </div>
      </div>

      {/* Match reasons */}
      {match.reasons && match.reasons.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {match.reasons.slice(0, 3).map((r, i) => (
            <span key={i} style={{
              fontSize: 11, color: C.t2, background: C.c2, padding: "4px 10px",
              borderRadius: 8, lineHeight: 1.4,
            }}>
              {r.detail || r}
            </span>
          ))}
        </div>
      )}

      {/* Strengths & gaps */}
      <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(match.strengths || []).slice(0, 2).map((s, i) => (
          <span key={`s-${i}`} style={{
            fontSize: 10, fontFamily: MONO, color: C.grn, background: C.grn + "11",
            padding: "3px 8px", borderRadius: 6,
          }}>
            + {s}
          </span>
        ))}
        {(match.gaps || []).slice(0, 2).map((g, i) => (
          <span key={`g-${i}`} style={{
            fontSize: 10, fontFamily: MONO, color: C.acc, background: C.acc + "11",
            padding: "3px 8px", borderRadius: 6,
          }}>
            - {g}
          </span>
        ))}
      </div>
    </div>
  );
}
