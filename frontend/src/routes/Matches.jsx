import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { C, MONO } from '../theme';
import useStore from '../store';
import MatchCard from '../components/jobs/MatchCard';
import Spinner from '../components/ui/Spinner';
import ScanBar from '../components/ui/ScanBar';

export default function Matches() {
  const { matches, loading, loadMatches, refreshMatches, profile } = useStore();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all"); // all, strong, stretch

  useEffect(() => {
    if (matches.length === 0) loadMatches();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await refreshMatches();
    setRefreshing(false);
  };

  const filtered = matches.filter((m) => {
    if (filter === "strong") return m.score >= 0.7;
    if (filter === "stretch") return m.score >= 0.4 && m.score < 0.7;
    return true;
  });

  const newCount = matches.filter(
    (m) => new Date(m.computed_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  ).length;

  if (loading && matches.length === 0) {
    return (
      <div style={{ padding: "60px 16px", textAlign: "center" }}>
        <Spinner size={36} color={C.acc} />
        <p style={{ color: C.t3, fontSize: 13, marginTop: 16 }}>Loading your matches...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 660, margin: "0 auto", padding: "16px 16px 60px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontFamily: MONO, letterSpacing: 2, color: C.acc, marginBottom: 4 }}>
            AI MATCHES
          </div>
          <h2 style={{ color: C.t1, fontSize: 24, fontWeight: 800, margin: 0 }}>
            {matches.length} matches
          </h2>
          {newCount > 0 && (
            <span style={{
              fontSize: 11, fontFamily: MONO, color: C.grn, background: C.grn + "15",
              padding: "2px 8px", borderRadius: 99, marginTop: 4, display: "inline-block",
            }}>
              {newCount} new since yesterday
            </span>
          )}
        </div>
        <button onClick={refresh} disabled={refreshing}
          style={{
            padding: "10px 20px", background: refreshing ? C.c2 : C.grad,
            color: refreshing ? C.t3 : "#fff", border: "none", borderRadius: 10,
            fontSize: 13, fontWeight: 700, cursor: refreshing ? "wait" : "pointer",
          }}>
          {refreshing ? "Matching..." : "Refresh Matches"}
        </button>
      </div>

      {refreshing && <ScanBar />}

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { id: "all", label: "All", count: matches.length },
          { id: "strong", label: "Strong Fit", count: matches.filter((m) => m.score >= 0.7).length },
          { id: "stretch", label: "Worth a Shot", count: matches.filter((m) => m.score >= 0.4 && m.score < 0.7).length },
        ].map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{
              padding: "6px 14px", fontSize: 12, fontFamily: MONO,
              border: `1px solid ${filter === f.id ? C.acc + "55" : C.br}`,
              borderRadius: 99, background: filter === f.id ? C.acc + "15" : "transparent",
              color: filter === f.id ? C.acc : C.t3, cursor: "pointer", fontWeight: 600,
            }}>
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Match list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <span style={{ fontSize: 48, display: "block", marginBottom: 16 }}>{"\u{26A1}"}</span>
          <h3 style={{ color: C.t1, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            {matches.length === 0 ? "No matches yet" : "No matches in this filter"}
          </h3>
          <p style={{ color: C.t3, fontSize: 14, lineHeight: 1.6, maxWidth: 400, margin: "0 auto 16px" }}>
            {matches.length === 0
              ? !profile?.onboarding_complete
                ? "Complete your profile setup so FLINT can match you with the best jobs."
                : 'Click "Refresh Matches" to have FLINT analyze jobs against your profile.'
              : "Try a different filter to see more matches."}
          </p>
          {matches.length === 0 && !profile?.onboarding_complete && (
            <button onClick={() => navigate("/onboarding")}
              style={{
                padding: "12px 28px", background: C.grad, color: "#fff", border: "none",
                borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>
              Set Up Profile
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}
