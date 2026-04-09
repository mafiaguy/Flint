// ═══════════════════════════════════════════════════════════
// 🔥 FLINT — Trigger Auto-Apply Worker on Demand
// Calls GitHub Actions API to start the Playwright worker
// immediately instead of waiting for the 15-min cron.
//
// Requires: GITHUB_PAT secret (Personal Access Token with
//           repo + actions:write scope)
//
// Deploy: supabase functions deploy trigger-apply --no-verify-jwt
// Secret: supabase secrets set GITHUB_PAT=ghp_...
//         supabase secrets set GITHUB_REPO=mafiaguy/flint
// ═══════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const GITHUB_PAT = Deno.env.get("GITHUB_PAT") || "";
const GITHUB_REPO = Deno.env.get("GITHUB_REPO") || "mafiaguy/flint";

const ALLOWED_ORIGINS = [
  "https://mafiaguy.github.io",
  "http://localhost:3000",
];

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, pragma",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors(req) });
  }

  if (!GITHUB_PAT) {
    return new Response(
      JSON.stringify({ error: "GITHUB_PAT not configured" }),
      { status: 500, headers: { ...cors(req), "Content-Type": "application/json" } }
    );
  }

  try {
    // Trigger the auto-apply workflow via GitHub API
    const r = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/auto-apply.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_PAT}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "FLINT-Bot",
        },
        body: JSON.stringify({ ref: "main" }),
      }
    );

    if (r.status === 204) {
      return new Response(
        JSON.stringify({ triggered: true, message: "Auto-apply worker started. Check your tracked applications." }),
        { headers: { ...cors(req), "Content-Type": "application/json" } }
      );
    } else {
      const err = await r.text();
      return new Response(
        JSON.stringify({ triggered: false, error: `GitHub API ${r.status}: ${err.slice(0, 200)}` }),
        { status: r.status, headers: { ...cors(req), "Content-Type": "application/json" } }
      );
    }
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...cors(req), "Content-Type": "application/json" } }
    );
  }
});