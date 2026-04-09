import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { C } from '../../theme';
import useStore from '../../store';

const NAV = [
  { path: "/matches", label: "Matches" },
  { path: "/browse",  label: "Browse" },
  { path: "/tracker", label: "Tracker" },
  { path: "/profile", label: "Profile" },
];

export default function Header() {
  const { profile, signOut } = useStore();
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const activePath = location.pathname.startsWith('/job/') ? '/matches' : location.pathname;

  return (
    <div style={{ borderBottom: `1px solid ${C.br}`, background: C.bg, position: "sticky", top: 0, zIndex: 50 }}>
      <header style={{
        display: "flex", alignItems: "center", gap: 24,
        padding: "0 32px", height: 48,
        maxWidth: 1200, width: "100%", margin: "0 auto",
      }}>
        {/* Logo */}
        <span
          style={{ fontSize: 15, fontWeight: 800, color: C.t1, cursor: "pointer", flexShrink: 0 }}
          onClick={() => navigate("/matches")}
        >
          flint
        </span>

        {/* Nav */}
        <nav style={{ display: "flex", gap: 4 }}>
          {NAV.map((n) => {
            const active = activePath === n.path;
            return (
              <button
                key={n.path}
                onClick={() => navigate(n.path)}
                style={{
                  padding: "6px 12px", border: "none", borderRadius: 6,
                  background: active ? C.c2 : "transparent",
                  color: active ? C.t1 : C.t3,
                  cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 400,
                  fontFamily: "inherit",
                }}
              >
                {n.label}
              </button>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />

        {/* Avatar */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div onClick={() => setShowMenu((p) => !p)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} style={{ width: 26, height: 26, borderRadius: 99 }} alt="" />
            ) : (
              <div style={{
                width: 26, height: 26, borderRadius: 99, background: C.c2, color: C.t2,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600,
              }}>
                {(profile?.name || "U")[0]}
              </div>
            )}
          </div>

          {showMenu && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setShowMenu(false)} />
              <div style={{
                position: "absolute", right: 0, top: 36, background: C.c1,
                border: `1px solid ${C.br}`, borderRadius: 10, padding: 6,
                minWidth: 200, zIndex: 100, animation: "up .15s ease",
                boxShadow: "0 8px 30px rgba(0,0,0,.4)",
              }}>
                <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.br}`, marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.t1 }}>{profile?.name}</div>
                  <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{profile?.email}</div>
                </div>
                <button onClick={() => { navigate("/profile"); setShowMenu(false); }}
                  style={{ width: "100%", padding: "8px 12px", background: "transparent", border: "none", color: C.t1, fontSize: 13, textAlign: "left", cursor: "pointer", borderRadius: 6 }}>
                  Profile
                </button>
                <button onClick={() => { navigate("/onboarding"); setShowMenu(false); }}
                  style={{ width: "100%", padding: "8px 12px", background: "transparent", border: "none", color: C.t1, fontSize: 13, textAlign: "left", cursor: "pointer", borderRadius: 6 }}>
                  Edit preferences
                </button>
                <div style={{ borderTop: `1px solid ${C.br}`, margin: "4px 0" }} />
                <button onClick={async () => { setShowMenu(false); await signOut(); navigate("/"); }}
                  style={{ width: "100%", padding: "8px 12px", background: "transparent", border: "none", color: C.red, fontSize: 13, textAlign: "left", cursor: "pointer", borderRadius: 6 }}>
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </header>
    </div>
  );
}
