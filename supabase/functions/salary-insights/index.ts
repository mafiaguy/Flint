// ═══════════════════════════════════════════════════════
// FLINT — Salary Insights (Pure SQL, no AI)
//
// Aggregates salary data from scraped jobs to show
// market rates for a given role/region combination.
//
// Deploy:
//   supabase functions deploy salary-insights
// ═══════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, pragma",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Try to parse a salary string into a number (annual, original currency)
function parseSalary(s: string): number | null {
  if (!s || s === "—" || s === "-") return null;
  // Remove currency symbols, commas, spaces
  const cleaned = s.replace(/[£$€₹,\s]/g, "").toLowerCase();
  // Extract first number
  const match = cleaned.match(/([\d.]+)/);
  if (!match) return null;
  let num = parseFloat(match[1]);
  if (isNaN(num) || num === 0) return null;
  // Heuristic: if number < 1000, likely in thousands (e.g. "85k")
  if (cleaned.includes("k") || (num > 10 && num < 1000)) num *= 1000;
  // If number < 10000, likely monthly — multiply by 12
  if (num > 0 && num < 10000) num *= 12;
  return num;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { category, country, role_keywords } = await req.json();
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Build query
    let query = sb
      .from("jobs")
      .select("salary, title, country, category")
      .neq("salary", "—")
      .neq("salary", "-")
      .not("salary", "is", null)
      .gte("posted", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
      .limit(500);

    if (category && category !== "All") {
      query = query.eq("category", category);
    }
    if (country) {
      query = query.eq("country", country);
    }

    const { data: jobs, error } = await query;
    if (error || !jobs?.length) {
      return new Response(
        JSON.stringify({
          error: null,
          message: "Not enough salary data available",
          sample_size: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and filter valid salaries
    const salaries = jobs
      .map((j) => parseSalary(j.salary))
      .filter((s): s is number => s !== null && s > 5000 && s < 10000000)
      .sort((a, b) => a - b);

    if (salaries.length < 3) {
      return new Response(
        JSON.stringify({
          message: "Not enough valid salary data",
          sample_size: salaries.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate percentiles
    const p = (arr: number[], pct: number) => {
      const idx = Math.floor(arr.length * pct);
      return arr[Math.min(idx, arr.length - 1)];
    };

    const insights = {
      sample_size: salaries.length,
      category: category || "All",
      country: country || "All",
      currency: country === "in" ? "INR" : country === "gb" ? "GBP" : country === "de" || country === "fr" ? "EUR" : "USD",
      percentile_25: Math.round(p(salaries, 0.25)),
      median: Math.round(p(salaries, 0.5)),
      percentile_75: Math.round(p(salaries, 0.75)),
      min: Math.round(salaries[0]),
      max: Math.round(salaries[salaries.length - 1]),
    };

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Salary insights error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
