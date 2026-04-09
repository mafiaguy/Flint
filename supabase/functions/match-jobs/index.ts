// ═══════════════════════════════════════════════════════
// FLINT — Batch Job Matching Orchestrator
//
// 1. Loads user profile + resume_text
// 2. Pre-filters jobs by preferred_roles, regions, recency
// 3. Skips already-matched jobs
// 4. Batches remaining jobs (10 per LLM call)
// 5. Upserts results into job_matches
//
// Deploy:
//   supabase functions deploy match-jobs
// ═══════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const GROQ_KEY = Deno.env.get("GROQ_API_KEY");
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

const BATCH_SIZE = 8; // jobs per LLM call
const MAX_BATCHES = 15; // max 120 jobs per run (15 * 8)
const MAX_JOB_AGE_DAYS = 21;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, cache-control, pragma",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callGroqBatchMatch(
  profile: any,
  jobsBatch: any[]
): Promise<any[]> {
  if (!GROQ_KEY) return [];

  const systemPrompt = `You are a job matching engine. Score each job against the candidate profile.

Return ONLY a valid JSON array. No markdown fences, no explanation, just the raw JSON array:
[{"job_id":"id","score":0.85,"reasons":[{"category":"skill_match","detail":"reason"}],"strengths":["s1"],"gaps":["g1"],"verdict":"apply"}]

Rules:
- score: 0.0 to 1.0 (0.8+ = strong fit, 0.5-0.8 = stretch, <0.5 = skip)
- verdict: "apply" | "stretch" | "skip"
- reasons: 1-3 with category: skill_match, experience_match, domain_match, location_match
- Be honest. Don't inflate scores.`;

  const jobList = jobsBatch
    .map(
      (j) =>
        `[ID: ${j.id}] ${j.title} at ${j.company}, ${j.location}${j.remote ? " (Remote)" : ""}\n${(j.description || "").slice(0, 350)}`
    )
    .join("\n---\n");

  const userPrompt = `CANDIDATE: ${profile.name || "Unknown"}, ${profile.role || "Engineer"}, ${profile.experience || "?"} years
Skills: ${profile.skills || "Not specified"}
Resume: ${(profile.resume_text || "").slice(0, 600)}
Preferred roles: ${(profile.preferred_roles || []).join(", ") || "Any"}

JOBS TO SCORE (${jobsBatch.length}):
${jobList}`;

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 3000,
        temperature: 0.3, // lower temp for more consistent JSON
      }),
    });

    if (!res.ok) {
      console.error("Groq batch-match error:", await res.text());
      return [];
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Try to parse JSON — handle both raw JSON and markdown-fenced JSON
    let cleaned = content.trim();
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) cleaned = fenceMatch[1].trim();

    // Find the array in the response
    const arrStart = cleaned.indexOf("[");
    const arrEnd = cleaned.lastIndexOf("]");
    if (arrStart === -1 || arrEnd === -1) return [];
    cleaned = cleaned.slice(arrStart, arrEnd + 1);

    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error("Batch match parse error:", e);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the user from the JWT token
    const authHeader = req.headers.get("Authorization") || "";
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Try to get user_id from body (for service-role calls) or from JWT
    let userId: string | null = null;
    let body: any = {};
    try {
      body = await req.json();
      userId = body.user_id || null;
    } catch {
      // Empty body is fine
    }

    // If no user_id in body, try to get from JWT
    if (!userId && authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const anonSb = createClient(SUPABASE_URL, token);
      const { data: { user } } = await anonSb.auth.getUser();
      userId = user?.id || null;
    }

    if (!userId) {
      return jsonResponse({ error: "No user identified" }, 401);
    }

    // 1. Load user profile
    const { data: profile, error: profileErr } = await sb
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileErr || !profile) {
      return jsonResponse({ error: "Profile not found" }, 404);
    }

    // 2. Build job query with pre-filters
    const cutoffDate = new Date(
      Date.now() - MAX_JOB_AGE_DAYS * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .split("T")[0];

    let jobQuery = sb
      .from("jobs")
      .select("id, title, company, location, country, description, remote, category, salary, source, url, posted")
      .gte("posted", cutoffDate)
      .order("posted", { ascending: false })
      .limit(200);

    // Filter by preferred regions if set
    if (profile.preferred_regions?.length > 0) {
      // Include remote jobs + preferred regions
      const regions = [...profile.preferred_regions];
      jobQuery = jobQuery.in("country", regions);
    }

    const { data: allJobs, error: jobsErr } = await jobQuery;
    if (jobsErr || !allJobs?.length) {
      return jsonResponse({ matched: 0, total_candidates: 0, message: "No jobs found" });
    }

    // 3. Get already-matched job IDs for this user
    const { data: existingMatches } = await sb
      .from("job_matches")
      .select("job_id")
      .eq("user_id", userId);

    const matchedIds = new Set((existingMatches || []).map((m: any) => m.job_id));

    // 4. Filter to unmatched jobs only
    const newJobs = allJobs.filter((j: any) => !matchedIds.has(j.id));

    if (newJobs.length === 0) {
      return jsonResponse({
        matched: 0,
        total_candidates: allJobs.length,
        message: "All jobs already matched",
        existing_matches: matchedIds.size,
      });
    }

    // 5. Batch and score
    let totalMatched = 0;
    const batches = Math.min(
      Math.ceil(newJobs.length / BATCH_SIZE),
      MAX_BATCHES
    );

    for (let i = 0; i < batches; i++) {
      const batch = newJobs.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      const results = await callGroqBatchMatch(profile, batch);

      if (results.length > 0) {
        // Upsert results into job_matches
        const rows = results
          .filter((r: any) => r.job_id && typeof r.score === "number")
          .map((r: any) => ({
            user_id: userId,
            job_id: r.job_id,
            score: Math.max(0, Math.min(1, r.score)),
            reasons: r.reasons || [],
            strengths: r.strengths || [],
            gaps: r.gaps || [],
            verdict: r.verdict || (r.score >= 0.7 ? "apply" : r.score >= 0.4 ? "stretch" : "skip"),
            computed_at: new Date().toISOString(),
          }));

        if (rows.length > 0) {
          const { error: upsertErr } = await sb
            .from("job_matches")
            .upsert(rows, { onConflict: "user_id,job_id" });

          if (upsertErr) {
            console.error("Upsert error:", upsertErr);
          } else {
            totalMatched += rows.length;
          }
        }
      }

      // Small delay between batches to respect rate limits
      if (i < batches - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    return jsonResponse({
      matched: totalMatched,
      total_candidates: allJobs.length,
      new_jobs: newJobs.length,
      batches_processed: batches,
    });
  } catch (e) {
    console.error("Match-jobs error:", e);
    return jsonResponse({ error: e.message }, 500);
  }
});
