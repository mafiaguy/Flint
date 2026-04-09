// Constants still used by components that can't use Tailwind (PDF renderer, etc.)
// Colors for inline styles where Tailwind classes aren't available

export const C = {
  bg: "#09090b", c1: "#0e0e14", c2: "#15151e", br: "#1c1c2a",
  t1: "#fafafa", t2: "#a1a1aa", t3: "#71717a",
  acc: "#f59e0b", red: "#ef4444", grn: "#22c55e", blu: "#3b82f6", pur: "#a78bfa",
  grad: "linear-gradient(135deg,#f59e0b,#ef4444,#ec4899)",
};

export const MONO = "'SF Mono','JetBrains Mono','Fira Code',monospace";

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
  LinkedIn: "#0a66c2", Greenhouse: "#3b8132", HackerNews: "#ff6600",
  Adzuna: "#59b54c", Ashby: "#6366f1", Lever: "#4b5563",
  Workable: "#00bcd4", Naukri: "#2196f3", Apify: "#00c7b7",
};

export const PIPELINE_STAGES = [
  { id: "applied",          label: "Applied",          color: "#3b82f6" },
  { id: "first_call",       label: "First Call",       color: "#f59e0b" },
  { id: "interview",        label: "Interview",        color: "#a78bfa" },
  { id: "second_interview",  label: "Second Interview", color: "#ec4899" },
  { id: "offer",            label: "Offer",            color: "#22c55e" },
  { id: "accepted",         label: "Accepted",         color: "#10b981" },
  { id: "rejected",         label: "Rejected",         color: "#ef4444" },
  { id: "withdrawn",        label: "Withdrawn",        color: "#71717a" },
];
