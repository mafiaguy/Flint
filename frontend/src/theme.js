// ── FLINT Design Tokens ──

export const MONO = "'SF Mono','JetBrains Mono','Fira Code',monospace";

export const C = {
  bg:   "#08080c",
  c1:   "#0e0e14",
  c2:   "#15151e",
  br:   "#1c1c2a",
  t1:   "#eeeef2",
  t2:   "#8e8e9a",
  t3:   "#4e4e5a",
  acc:  "#f59e0b",
  red:  "#ef4444",
  grn:  "#22c55e",
  blu:  "#3b82f6",
  pur:  "#a78bfa",
  grad: "linear-gradient(135deg,#f59e0b,#ef4444,#ec4899)",
};

export const FLAGS = {
  in: "\u{1F1EE}\u{1F1F3}", gb: "\u{1F1EC}\u{1F1E7}", de: "\u{1F1E9}\u{1F1EA}",
  fr: "\u{1F1EB}\u{1F1F7}", us: "\u{1F1FA}\u{1F1F8}", ca: "\u{1F1E8}\u{1F1E6}",
  au: "\u{1F1E6}\u{1F1FA}", ie: "\u{1F1EE}\u{1F1EA}", sg: "\u{1F1F8}\u{1F1EC}",
  remote: "\u{1F30D}", other: "\u{1F310}",
};

export const CATS = [
  "All","SRE","Platform","Security","DevSecOps","DevOps","Cloud",
  "Infrastructure","Backend","Frontend","Fullstack","Data","ML/AI",
  "Mobile","QA","Product","Architect",
];

export const SOURCE_COLORS = {
  LinkedIn:    "#0a66c2",
  Greenhouse:  "#3b8132",
  HackerNews:  "#ff6600",
  Adzuna:      "#59b54c",
  Ashby:       "#6366f1",
  Lever:       "#4b5563",
  Workable:    "#00bcd4",
  Naukri:      "#2196f3",
  Apify:       "#00c7b7",
};

export const PIPELINE_STAGES = [
  { id: "applied",          label: "Applied",          color: C.blu },
  { id: "first_call",       label: "First Call",       color: C.acc },
  { id: "interview",        label: "Interview",        color: C.pur },
  { id: "second_interview",  label: "Second Interview", color: "#ec4899" },
  { id: "offer",            label: "Offer",            color: C.grn },
  { id: "accepted",         label: "Accepted",         color: "#10b981" },
  { id: "rejected",         label: "Rejected",         color: C.red },
  { id: "withdrawn",        label: "Withdrawn",        color: C.t3 },
];

export const globalCSS = `
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.br};border-radius:3px}
::selection{background:${C.acc}33;color:${C.acc}}
@keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes scan{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
*{box-sizing:border-box;margin:0;padding:0}
html{overflow-x:hidden}
body{font-family:system-ui,-apple-system,sans-serif;background:${C.bg};color:${C.t1};-webkit-font-smoothing:antialiased;overflow-x:hidden;min-height:100vh;min-height:100dvh}
input,textarea,select{font-family:inherit;color:${C.t1};background:${C.c1};border:1px solid ${C.br};border-radius:8px;padding:10px 14px;font-size:16px;outline:none;width:100%;box-sizing:border-box;caret-color:${C.acc}}
input::placeholder,textarea::placeholder{color:${C.t3}}
input:focus,textarea:focus{border-color:${C.acc}44}
a{color:${C.blu};text-decoration:none}
button{-webkit-tap-highlight-color:transparent}
.match-card:hover{border-color:${C.t3}44 !important}
@media(max-width:480px){
  .kanban-scroll{-webkit-overflow-scrolling:touch}
  input,textarea,select{font-size:16px}
}
`;
