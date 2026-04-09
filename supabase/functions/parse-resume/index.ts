// ═══════════════════════════════════════════════════════
// FLINT — Resume Text Extraction
//
// Extracts text from uploaded resume PDFs and stores
// it in profiles.resume_text for AI matching.
//
// Approach: Downloads PDF from Supabase Storage,
// extracts text using basic PDF text stream parsing.
// Falls back to the user providing text manually.
//
// Deploy:
//   supabase functions deploy parse-resume
// ═══════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

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

// Basic PDF text extraction — extracts text streams from PDF binary
// This handles most simple PDFs (single-column, text-based)
function extractTextFromPDF(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const text = new TextDecoder("latin1").decode(bytes);
  const extracted: string[] = [];

  // Method 1: Extract text between BT/ET blocks (PDF text objects)
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match;
  while ((match = btEtRegex.exec(text)) !== null) {
    const block = match[1];
    // Extract strings in parentheses (Tj operator)
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      const str = tjMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/\\\\/g, "\\");
      if (str.trim()) extracted.push(str);
    }

    // TJ operator (array of strings)
    const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
    let tjArrMatch;
    while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
      const arrContent = tjArrMatch[1];
      const strRegex = /\(([^)]*)\)/g;
      let strMatch;
      while ((strMatch = strRegex.exec(arrContent)) !== null) {
        const str = strMatch[1]
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "")
          .replace(/\\\(/g, "(")
          .replace(/\\\)/g, ")")
          .replace(/\\\\/g, "\\");
        if (str.trim()) extracted.push(str);
      }
    }
  }

  // Method 2: If BT/ET extraction got nothing, try extracting readable ASCII sequences
  if (extracted.length === 0) {
    const asciiRegex = /[\x20-\x7E]{4,}/g;
    let asciiMatch;
    const seen = new Set<string>();
    while ((asciiMatch = asciiRegex.exec(text)) !== null) {
      const str = asciiMatch[0].trim();
      // Filter out PDF operators and metadata
      if (
        str.length > 5 &&
        !str.startsWith("/") &&
        !str.includes("endobj") &&
        !str.includes("stream") &&
        !str.includes("xref") &&
        !str.includes("startxref") &&
        !/^[\d\s.]+$/.test(str) &&
        !seen.has(str)
      ) {
        seen.add(str);
        extracted.push(str);
      }
    }
  }

  return extracted.join(" ").replace(/\s+/g, " ").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, resume_url, resume_text } = await req.json();

    if (!user_id) {
      return jsonResponse({ error: "user_id required" }, 400);
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    let finalText = "";

    // Option 1: User provided text directly (paste fallback)
    if (resume_text) {
      finalText = resume_text.slice(0, 10000);
    }
    // Option 2: Extract from uploaded PDF
    else if (resume_url) {
      try {
        // Download the file from Supabase Storage
        // resume_url format: .../storage/v1/object/public/resumes/user_id/filename.pdf
        const pathMatch = resume_url.match(/resumes\/(.+)$/);
        if (!pathMatch) {
          return jsonResponse({ error: "Invalid resume URL format" }, 400);
        }

        const filePath = decodeURIComponent(pathMatch[1]);
        const { data: fileData, error: dlError } = await sb.storage
          .from("resumes")
          .download(filePath);

        if (dlError || !fileData) {
          console.error("Download error:", dlError);
          return jsonResponse({
            error: "Could not download resume. Try pasting your resume text instead.",
            needs_manual: true,
          }, 400);
        }

        const buffer = await fileData.arrayBuffer();
        finalText = extractTextFromPDF(buffer);

        if (finalText.length < 50) {
          return jsonResponse({
            text: finalText,
            warning: "Could not extract much text from the PDF. The file may be image-based or encrypted. Try pasting your resume text during onboarding.",
            needs_manual: true,
            chars_extracted: finalText.length,
          });
        }
      } catch (e) {
        console.error("PDF parse error:", e);
        return jsonResponse({
          error: "Failed to parse PDF. Try pasting your resume text instead.",
          needs_manual: true,
        }, 400);
      }
    } else {
      return jsonResponse({ error: "Provide resume_url or resume_text" }, 400);
    }

    // Truncate to reasonable length
    finalText = finalText.slice(0, 10000);

    // Save to profiles table
    const { error: updateErr } = await sb
      .from("profiles")
      .update({ resume_text: finalText })
      .eq("id", user_id);

    if (updateErr) {
      console.error("Profile update error:", updateErr);
      return jsonResponse({ error: "Failed to save resume text" }, 500);
    }

    return jsonResponse({
      text: finalText,
      chars: finalText.length,
      message: "Resume text extracted and saved to profile",
    });
  } catch (e) {
    console.error("Parse-resume error:", e);
    return jsonResponse({ error: e.message }, 500);
  }
});
