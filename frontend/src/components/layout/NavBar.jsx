import { useLocation, useNavigate } from 'react-router-dom';
import { C, MONO } from '../../theme';

const NAV = [
  { path: "/matches",  icon: "\u{26A1}", label: "Matches" },
  { path: "/browse",   icon: "\u{1F50D}", label: "Browse" },
  { path: "/tracker",  icon: "\u{1F4CB}", label: "Tracker" },
  { path: "/profile",  icon: "\u{1F464}", label: "Profile" },
];

export default function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  // Match /job/:id to Matches tab, /onboarding to none
  const activePath = location.pathname.startsWith('/job/') ? '/matches' : location.pathname;

  return (
    <div style={{
      display: "flex", borderBottom: `1px solid ${C.br}`, background: C.c1,
      position: "sticky", top: 0, zIndex: 50,
    }}>
      {NAV.map((n) => {
        const active = activePath === n.path;
        return (
          <button
            key={n.path}
            onClick={() => navigate(n.path)}
            style={{
              flex: 1, padding: "8px 4px 6px", display: "flex", flexDirection: "column",
              alignItems: "center", gap: 1, border: "none",
              background: active ? C.bg : "transparent",
              borderBottom: active ? `2px solid ${C.acc}` : "2px solid transparent",
              color: active ? C.acc : C.t3,
              cursor: "pointer", fontSize: 9, fontWeight: 700, fontFamily: MONO,
              minHeight: 44, justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 18 }}>{n.icon}</span>
            {n.label}
          </button>
        );
      })}
    </div>
  );
}
