import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { C, MONO } from '../../theme';
import useStore from '../../store';

export default function Header() {
  const { profile, signOut } = useStore();
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  return (
    <div style={{
      padding: "10px 16px", display: "flex", alignItems: "center", gap: 8,
      borderBottom: `1px solid ${C.br}`, background: C.bg,
    }}>
      <span style={{ fontSize: 20, cursor: "pointer" }} onClick={() => navigate("/matches")}>
        {"\u{1F525}"}
      </span>
      <span style={{
        fontSize: 18, fontWeight: 900, background: C.grad,
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        cursor: "pointer",
      }} onClick={() => navigate("/matches")}>
        FLINT
      </span>
      <div style={{ flex: 1 }} />
      <span style={{ width: 7, height: 7, borderRadius: 99, background: C.grn, animation: "pulse 2s infinite" }} />
      <span style={{ fontSize: 10, fontFamily: MONO, color: C.t3 }}>LIVE</span>

      <div style={{ position: "relative", marginLeft: 8 }}>
        <div onClick={() => setShowMenu((p) => !p)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} style={{ width: 28, height: 28, borderRadius: 99 }} alt="" />
          ) : (
            <div style={{
              width: 28, height: 28, borderRadius: 99, background: C.acc + "22", color: C.acc,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700,
            }}>
              {(profile?.name || "U")[0]}
            </div>
          )}
          <svg width="12" height="12" fill="none" stroke={C.t3} strokeWidth="2" viewBox="0 0 24 24">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>

        {showMenu && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setShowMenu(false)} />
            <div style={{
              position: "absolute", right: 0, top: 40, background: C.c1,
              border: `1px solid ${C.br}`, borderRadius: 12, padding: 8,
              minWidth: 200, zIndex: 100, animation: "up .15s ease",
              boxShadow: "0 8px 30px rgba(0,0,0,.5)",
            }}>
              <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.br}`, marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.t1 }}>{profile?.name}</div>
                <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{profile?.email}</div>
              </div>
              <button onClick={() => { navigate("/profile"); setShowMenu(false); }}
                style={{ width: "100%", padding: "9px 12px", background: "transparent", border: "none", color: C.t1, fontSize: 13, textAlign: "left", cursor: "pointer", borderRadius: 6 }}>
                Profile
              </button>
              <button onClick={() => { navigate("/onboarding"); setShowMenu(false); }}
                style={{ width: "100%", padding: "9px 12px", background: "transparent", border: "none", color: C.t1, fontSize: 13, textAlign: "left", cursor: "pointer", borderRadius: 6 }}>
                Edit Preferences
              </button>
              <div style={{ borderTop: `1px solid ${C.br}`, margin: "6px 0" }} />
              <button onClick={async () => { setShowMenu(false); await signOut(); navigate("/"); }}
                style={{ width: "100%", padding: "9px 12px", background: "transparent", border: "none", color: C.red, fontSize: 13, textAlign: "left", cursor: "pointer", borderRadius: 6, fontWeight: 600 }}>
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
