// ═══════════════════════════════════════════════════════
// 🔥 FLINT — Live Job Search Edge Function
// Proxies Adzuna API calls so keys stay server-side
// Also searches the Supabase jobs table
//
// Deploy:
//   supabase functions deploy search-jobs
//   supabase secrets set ADZUNA_APP_ID=... ADZUNA_APP_KEY=...
// ═══════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ADZUNA_ID = Deno.env.get("ADZUNA_APP_ID");
const ADZUNA_KEY = Deno.env.get("ADZUNA_APP_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const COUNTRIES = ["in", "gb", "de", "fr", "us", "ca", "au"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function categorize(title: string): string {
  const t = title.toLowerCase();
  if (/sre|site.?reliab/.test(t)) return "SRE";
  if (/platform/.test(t)) return "Platform";
  if (/devsecops/.test(t)) return "DevSecOps";
  if (/secur/.test(t)) return "Security";
  if (/devops/.test(t)) return "DevOps";
  if (/infra/.test(t)) return "Infrastructure";
  if (/cloud/.test(t)) return "Cloud";
  return "Engineering";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query, countries, limit } = await req.json();
    const searchTerm = query || "Engineer";
    const searchCountries = countries || COUNTRIES;
    const maxResults = Math.min(limit || 50, 100);

    const jobs: any[] = [];

    // ── 1. Search Supabase DB first (cached scraped jobs) ──
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
        const { data, error } = await sb
          .from("jobs")
          .select("*")
          .or(
            `title.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
          )
          .order("posted", { ascending: false })
          .limit(maxResults);

        if (data && !error) {
          jobs.push(...data);
        }
      } catch (e) {
        console.error("Supabase search error:", e);
      }
    }

    // ── 2. Live Adzuna search (real-time results) ──
    if (ADZUNA_ID && ADZUNA_KEY) {
      for (const cc of searchCountries.slice(0, 5)) {
        try {
          const url = `https://api.adzuna.com/v1/api/jobs/${cc}/search/1?app_id=${ADZUNA_ID}&app_key=${ADZUNA_KEY}&results_per_page=10&what=${encodeURIComponent(searchTerm)}&max_days_old=14&content-type=application/json`;

          const res = await fetch(url);
          if (!res.ok) continue;
          const data = await res.json();

          for (const j of data.results || []) {
            jobs.push({
              id: `az-${j.id}`,
              title: j.title,
              company: j.company?.display_name || "—",
              location: j.location?.display_name || cc.toUpperCase(),
              country: cc,
              description: (j.description || "").slice(0, 2000),
              url: j.redirect_url || "",
              salary: j.salary_min
                ? `${Math.round(j.salary_min).toLocaleString()}`
                : "—",
              source: "Adzuna",
              posted: j.created
                ? j.created.split("T")[0]
                : new Date().toISOString().split("T")[0],
              category: categorize(j.title),
              remote:
                /remote/i.test(j.title) ||
                /remote/i.test(j.description || ""),
            });
          }
        } catch {}
      }
    }

    // ── 3. Deduplicate ──
    const seen = new Set<string>();
    const unique = jobs.filter((j) => {
      const key = `${j.title}-${j.company}`
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by date
    unique.sort(
      (a, b) =>
        new Date(b.posted || 0).getTime() - new Date(a.posted || 0).getTime()
    );

    return new Response(
      JSON.stringify({ jobs: unique.slice(0, maxResults), total: unique.length }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("Search error:", e);
    return new Response(JSON.stringify({ error: e.message, jobs: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});