// ═══════════════════════════════════════════════════════
// 🔥 FLINT — AI Edge Function
// Proxies requests to Groq (free tier: 14,400 req/day)
// Groq API key stays server-side, users never see it
//
// Deploy:
//   supabase functions deploy ai
//   supabase secrets set GROQ_API_KEY=gsk_your_key_here
// ═══════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const GROQ_KEY = Deno.env.get("GROQ_API_KEY");
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callGroq(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 1200
): Promise<string> {
  if (!GROQ_KEY) {
    return "⚠ GROQ_API_KEY not configured. Run: supabase secrets set GROQ_API_KEY=gsk_...";
  }

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
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Groq error:", err);
    return `LLM error (${res.status}). Check GROQ_API_KEY or rate limits.`;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response from LLM.";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type, prompt, job, profile } = body;

    let text: string;

    switch (type) {
      // ── Job match analysis ──
      case "match": {
        const sys = `You are a brutally honest career advisor. Analyze the job listing against the candidate's profile.

Give exactly this format:
📊 MATCH SCORE: X/10

💪 STRENGTHS:
• [strength 1]
• [strength 2]
• [strength 3]

⚠️ GAPS:
• [gap 1]
• [gap 2]

🎯 VERDICT: [🟢 Apply / 🟡 Stretch / 🔴 Skip] — [one-line reason]

Be specific. Reference actual skills and requirements. Max 250 words.`;

        const usr = `JOB: ${job?.title} at ${job?.company}, ${job?.location}
${job?.desc || "No description available"}

CANDIDATE: ${profile?.name || "Unknown"}, ${profile?.role || "Engineer"}, ${profile?.exp || "?"} years experience
Skills: ${profile?.skills || "Not specified"}`;

        text = await callGroq(sys, usr);
        break;
      }

      // ── Cover letter generation ──
      case "cover": {
        const sys = `Write a compelling, specific cover letter. Rules:
- Max 180 words
- Open with WHY this company/role excites you (specific, not generic)
- Middle: match 2-3 of YOUR skills to THEIR requirements
- Close with notice period and enthusiasm
- No fluff. No "I am writing to express my interest."
- Sound like a human, not a template.`;

        const usr = `JOB: ${job?.title} at ${job?.company}
${job?.desc || ""}

CANDIDATE: ${profile?.name || "Candidate"}, ${profile?.role || "Engineer"}, ${profile?.exp || "?"} years
Skills: ${profile?.skills || "various"}
Notice: ${profile?.notice || "flexible"}`;

        text = await callGroq(sys, usr);
        break;
      }

      // ── General career chat ──
      case "chat": {
        const sys = `You are a sharp career advisor for ${profile?.name || "a tech professional"}, currently a ${profile?.role || "engineer"} with ${profile?.exp || "several"} years experience. Skills: ${profile?.skills || "various"}.

Be concise. Be actionable. Give specific advice, not platitudes. Max 300 words.`;

        text = await callGroq(sys, prompt || "Help me with my job search.");
        break;
      }

      default:
        return jsonResponse({ error: `Unknown type: ${type}` }, 400);
    }

    return jsonResponse({ text });
  } catch (e) {
    console.error("Edge function error:", e);
    return jsonResponse({ error: e.message }, 500);
  }
});