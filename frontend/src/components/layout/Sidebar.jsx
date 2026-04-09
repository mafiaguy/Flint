import { useNavigate, useLocation } from 'react-router-dom';
import { C } from '../../theme';
import useStore from '../../store';

const NAV = [
  { path: "/matches", label: "Matches" },
  { path: "/browse",  label: "Browse" },
  { path: "/tracker", label: "Tracker" },
  { path: "/profile", label: "Profile" },
];

export default function Sidebar() {
  const { profile, signOut } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const activePath = location.pathname.startsWith('/job/') ? '/matches' : location.pathname;

  return (
    <aside style={{
      width: 200, flexShrink: 0, background: C.c1,
      borderRight: `1px solid ${C.br}`, display: "flex", flexDirection: "column",
      height: "100vh", position: "sticky", top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "16px 20px 20px" }}>
        <span
          style={{ fontSize: 15, fontWeight: 800, color: C.t1, cursor: "pointer" }}
          onClick={() => navigate("/matches")}
        >
          flint
        </span>
      </div>

      {/* Nav links */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 8px", flex: 1 }}>
        {NAV.map((n) => {
          const active = activePath === n.path;
          return (
            <button
              key={n.path}
              onClick={() => navigate(n.path)}
              style={{
                padding: "8px 12px", border: "none", borderRadius: 6,
                background: active ? C.c2 : "transparent",
                color: active ? C.t1 : C.t3,
                cursor: "pointer", fontSize: 14, fontWeight: active ? 600 : 400,
                fontFamily: "inherit", textAlign: "left",
                transition: "background .1s, color .1s",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = C.t2; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = C.t3; }}
            >
              {n.label}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding: "12px", borderTop: `1px solid ${C.br}` }}>
        <div
          onClick={() => navigate("/profile")}
          style={{
            display: "flex", alignItems: "center", gap: 10, padding: "8px",
            borderRadius: 6, cursor: "pointer",
          }}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} style={{ width: 28, height: 28, borderRadius: 99 }} alt="" />
          ) : (
            <div style={{
              width: 28, height: 28, borderRadius: 99, background: C.c2, color: C.t2,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600,
            }}>
              {(profile?.name || "U")[0]}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {profile?.name || "User"}
            </div>
          </div>
        </div>
        <button
          onClick={async () => { await signOut(); navigate("/"); }}
          style={{
            width: "100%", padding: "6px 8px", background: "transparent", border: "none",
            color: C.t3, fontSize: 12, textAlign: "left", cursor: "pointer", borderRadius: 4,
            marginTop: 4,
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
