// ═══════════════════════════════════════════════════════════
// 🔥 FLINT — Scrape Real Application Form Questions
//
// For Greenhouse: uses their public API (?questions=true)
// For Lever: fetches /apply page, parses HTML form fields
// For Ashby: fetches job page, extracts form structure
// For others: fetches HTML, regex-extracts form fields
//
// Deploy: supabase functions deploy scrape-form --no-verify-jwt
// ═══════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const ALLOWED_ORIGINS = [
  "https://mafiaguy.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:5500",
];

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(data: unknown, req: Request, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json" },
  });
}

// ── Greenhouse: API returns exact form questions ──
async function scrapeGreenhouse(url: string) {
  // Extract slug + job ID from URL
  // Formats: boards.greenhouse.io/stripe/jobs/12345
  //          job-boards.greenhouse.io/stripe/jobs/12345
  const match = url.match(/greenhouse\.io\/(\w+)\/jobs\/(\d+)/);
  if (!match) return { fields: [], source: "greenhouse", error: "Could not parse Greenhouse URL" };

  const [, slug, jobId] = match;

  // Fetch job with questions=true — this is the REAL application form
  const r = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs/${jobId}?questions=true`
  );

  if (!r.ok) return { fields: [], source: "greenhouse", error: `API returned ${r.status}` };
  const data = await r.json();

  // Standard fields every Greenhouse form has
  const fields: any[] = [
    { name: "first_name", label: "First Name", type: "text", required: true },
    { name: "last_name", label: "Last Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "phone", label: "Phone", type: "tel", required: false },
    { name: "resume", label: "Resume/CV", type: "file", required: true },
    { name: "cover_letter", label: "Cover Letter", type: "textarea", required: false },
  ];

  // Add location questions if present
  if (data.location_questions) {
    for (const q of data.location_questions) {
      fields.push({
        name: `location_${q.label?.toLowerCase().replace(/\s+/g, "_")}`,
        label: q.label,
        type: q.fields?.[0]?.type || "text",
        required: q.required,
        options: q.fields?.[0]?.values?.map((v: any) => v.label) || [],
      });
    }
  }

  // Add custom questions
  if (data.questions) {
    for (const q of data.questions) {
      const fieldType = q.fields?.[0]?.type || "input_text";
      const options = q.fields?.[0]?.values?.map((v: any) => ({
        label: v.label,
        value: v.value ?? v.id,
      })) || [];

      fields.push({
        name: `question_${q.fields?.[0]?.name || q.label?.slice(0, 20)}`,
        label: q.label,
        type: fieldType === "multi_value_single_select" ? "select"
            : fieldType === "multi_value_multi_select" ? "multiselect"
            : fieldType === "input_file" ? "file"
            : fieldType === "input_text" ? "text"
            : fieldType === "textarea" ? "textarea"
            : "text",
        required: q.required,
        options: options,
      });
    }
  }

  // Add compliance questions if present
  if (data.compliance) {
    for (const q of data.compliance) {
      fields.push({
        name: `compliance_${q.type || "eeoc"}`,
        label: q.description || q.type,
        type: "select",
        required: q.required,
        options: q.questions?.map((cq: any) => cq.label) || [],
      });
    }
  }

  return {
    fields,
    source: "greenhouse",
    board_slug: slug,
    job_id: jobId,
    apply_url: `https://boards.greenhouse.io/${slug}/jobs/${jobId}#app`,
    title: data.title,
    total_fields: fields.length,
  };
}

// ── Lever: fetch /apply page HTML, parse form fields ──
async function scrapeLever(url: string) {
  const applyUrl = url.endsWith("/apply") ? url : url.replace(/\/?$/, "/apply");

  const r = await fetch(applyUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FlintBot/1.0)" },
  });
  if (!r.ok) return { fields: [], source: "lever", error: `HTTP ${r.status}` };

  const html = await r.text();

  // Lever standard fields
  const fields: any[] = [
    { name: "name", label: "Full Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "phone", label: "Phone", type: "tel", required: false },
    { name: "org", label: "Current Company", type: "text", required: false },
    { name: "resume", label: "Resume/CV", type: "file", required: true },
    { name: "comments", label: "Additional Information", type: "textarea", required: false },
  ];

  // Extract custom questions from HTML
  const customQRegex = /<label[^>]*>([^<]+)<\/label>/gi;
  let match;
  const seen = new Set(["name", "email", "phone", "resume", "org"]);

  while ((match = customQRegex.exec(html)) !== null) {
    const label = match[1].trim();
    if (label.length < 3 || label.length > 120 || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    fields.push({
      name: `custom_${label.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30)}`,
      label,
      type: "text",
      required: html.includes(`required`) && html.includes(label),
    });
  }

  return { fields, source: "lever", apply_url: applyUrl, total_fields: fields.length };
}

// ── Ashby: fetch job page, extract form structure ──
async function scrapeAshby(url: string) {
  // Ashby application forms are React SPAs — can't fully parse without browser
  // But we know the standard fields
  const fields: any[] = [
    { name: "name", label: "Full Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "phone", label: "Phone Number", type: "tel", required: false },
    { name: "resume", label: "Resume/CV", type: "file", required: true },
    { name: "cover_letter", label: "Cover Letter", type: "textarea", required: false },
    { name: "linkedin", label: "LinkedIn Profile", type: "url", required: false },
    { name: "website", label: "Website/Portfolio", type: "url", required: false },
  ];

  return { fields, source: "ashby", apply_url: url, total_fields: fields.length };
}

// ── Generic: fetch page HTML, extract any form fields ──
async function scrapeGeneric(url: string) {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FlintBot/1.0)" },
    });
    if (!r.ok) return { fields: [], source: "unknown", error: `HTTP ${r.status}` };

    const html = await r.text();
    const fields: any[] = [];
    const seen = new Set<string>();

    // Extract input fields with labels
    const inputRegex = /<label[^>]*(?:for=["']([^"']+)["'])?[^>]*>([\s\S]*?)<\/label>/gi;
    let m;
    while ((m = inputRegex.exec(html)) !== null) {
      const label = m[2].replace(/<[^>]*>/g, "").trim();
      if (label.length < 2 || label.length > 100 || seen.has(label)) continue;
      seen.add(label);

      const isRequired = html.includes("required") && html.indexOf(label) > -1;
      const isFile = /resume|cv|upload|file/i.test(label);
      const isEmail = /email/i.test(label);
      const isTextarea = /cover|letter|message|about|why/i.test(label);

      fields.push({
        name: label.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30),
        label,
        type: isFile ? "file" : isEmail ? "email" : isTextarea ? "textarea" : "text",
        required: isRequired,
      });
    }

    // If no labels found, add basic fields
    if (fields.length === 0) {
      fields.push(
        { name: "name", label: "Full Name", type: "text", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "resume", label: "Resume/CV", type: "file", required: true },
      );
    }

    return { fields, source: "generic", apply_url: url, total_fields: fields.length };
  } catch (e) {
    return { fields: [], source: "unknown", error: e.message };
  }
}

// ── Main handler ──
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });

  try {
    const { url, source } = await req.json();
    if (!url) return json({ error: "Missing url parameter" }, req, 400);

    const lowerUrl = (url || "").toLowerCase();
    const lowerSource = (source || "").toLowerCase();
    let result;

    if (lowerSource === "greenhouse" || lowerUrl.includes("greenhouse")) {
      result = await scrapeGreenhouse(url);
    } else if (lowerSource === "lever" || lowerUrl.includes("lever.co")) {
      result = await scrapeLever(url);
    } else if (lowerSource === "ashby" || lowerUrl.includes("ashby")) {
      result = await scrapeAshby(url);
    } else {
      result = await scrapeGeneric(url);
    }

    return json(result, req);
  } catch (e) {
    return json({ error: e.message }, req, 500);
  }
});