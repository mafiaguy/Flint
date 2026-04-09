import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { C, MONO } from '../theme';
import { db } from '../api';
import useStore from '../store';
import Spinner from '../components/ui/Spinner';

const FIRST_MESSAGE = (name) =>
  `Hey${name ? ` ${name}` : ""}! I'm FLINT, your AI job search agent.\n\nI'll match you with the best jobs from 10,000+ listings across 9 sources. But first, I need to know a bit about what you're looking for.\n\nWhat kind of role are you targeting?`;

export default function Onboarding() {
  const navigate = useNavigate();
  const { profile, saveProfile } = useStore();

  // Chat messages (displayed in UI)
  const [messages, setMessages] = useState([]);
  // Conversation history for LLM (includes system prompt context)
  const [llmHistory, setLlmHistory] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [completing, setCompleting] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  // Initialize conversation
  useEffect(() => {
    if (messages.length === 0) {
      const firstName = profile?.name?.split(" ")[0] || "";
      const greeting = FIRST_MESSAGE(firstName);
      setMessages([{ role: "assistant", content: greeting }]);
      // Don't add greeting to LLM history — the system prompt handles the first context
      setLlmHistory([]);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");

    // Update UI
    const updatedMessages = [...messages, { role: "user", content: userMsg }];
    setMessages(updatedMessages);

    // Build LLM conversation history
    const updatedHistory = [...llmHistory, { role: "user", content: userMsg }];
    setLlmHistory(updatedHistory);

    // Save to DB
    db.saveOnboardingMessage("user", userMsg);

    setLoading(true);

    // Call the onboard AI type with multi-turn messages
    const res = await db.callAI({
      type: "onboard",
      messages: updatedHistory,
      profile,
    });

    const aiText = res?.text || "Sorry, I had a hiccup. Could you try that again?";

    // Update UI and LLM history
    setMessages((prev) => [...prev, { role: "assistant", content: aiText }]);
    setLlmHistory((prev) => [...prev, { role: "assistant", content: aiText }]);
    db.saveOnboardingMessage("assistant", aiText);

    // Check if onboarding is complete (AI returned JSON block)
    const jsonMatch = aiText.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.complete && parsed.profile) {
          setCompleting(true);
          // Save all profile fields
          const profileData = {
            role: parsed.profile.role || profile?.role || "",
            experience: String(parsed.profile.experience || profile?.experience || ""),
            skills: parsed.profile.skills || profile?.skills || "",
            preferred_roles: parsed.profile.preferred_roles || [],
            preferred_regions: parsed.profile.preferred_regions || [],
            salary_min: parsed.profile.salary_min || null,
            salary_max: parsed.profile.salary_max || null,
            notice: parsed.profile.notice || "",
            visa: parsed.profile.visa || "",
            work_mode: parsed.profile.work_mode || "Remote",
            onboarding_complete: true,
          };
          await saveProfile(profileData);

          // Resume parsing already triggered during upload (handleResumeUpload)
          // Brief pause to show the summary, then navigate
          setTimeout(() => navigate("/matches"), 2000);
        }
      } catch {
        // JSON parse failed — AI is still conversing
      }
    }

    setLoading(false);
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFile(file);
    const url = await db.uploadResume(file);
    if (url) {
      setMessages((prev) => [
        ...prev,
        { role: "system", content: `Resume uploaded: ${file.name}` },
      ]);
      // Trigger text extraction in background
      db.parseResume(url);
    }
  };

  // Clean JSON block from displayed AI messages
  const cleanMessage = (text) => {
    return text.replace(/```json[\s\S]*?```/g, "").trim();
  };

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.br}`, flexShrink: 0 }}>
        <span style={{ fontSize: 20 }}>{"\u{1F525}"}</span>
        <span style={{ fontSize: 18, fontWeight: 900, background: C.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          FLINT
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: C.t3, fontFamily: MONO }}>SETUP</span>
      </div>

      {/* Progress hint */}
      <div style={{ padding: "8px 16px", borderBottom: `1px solid ${C.br}`, maxWidth: 640, width: "100%", margin: "0 auto" }}>
        <p style={{ fontSize: 11, color: C.t3, fontFamily: MONO, margin: 0 }}>
          Tell me about yourself and I'll find your perfect matches. Upload your resume anytime for better results.
        </p>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, overflow: "auto", padding: "20px 16px", maxWidth: 640, width: "100%", margin: "0 auto" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            marginBottom: 12, animation: "up .3s ease",
          }}>
            {msg.role === "system" ? (
              <div style={{
                width: "100%", textAlign: "center", fontSize: 12, color: C.grn,
                fontFamily: MONO, padding: "8px 0",
              }}>
                {msg.content}
              </div>
            ) : (
              <div style={{
                maxWidth: "85%", padding: "12px 16px", borderRadius: 16,
                background: msg.role === "user" ? C.acc + "22" : C.c1,
                border: `1px solid ${msg.role === "user" ? C.acc + "33" : C.br}`,
                color: C.t1, fontSize: 14, lineHeight: 1.6,
                borderBottomRightRadius: msg.role === "user" ? 4 : 16,
                borderBottomLeftRadius: msg.role === "user" ? 16 : 4,
              }}>
                {msg.role === "assistant" && (
                  <span style={{ fontSize: 10, fontFamily: MONO, color: C.acc, fontWeight: 700, display: "block", marginBottom: 4 }}>
                    FLINT
                  </span>
                )}
                <span style={{ whiteSpace: "pre-wrap" }}>
                  {cleanMessage(msg.content) || "Setting up your profile..."}
                </span>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0" }}>
            <Spinner size={20} color={C.acc} />
            <span style={{ fontSize: 12, color: C.t3 }}>FLINT is thinking...</span>
          </div>
        )}

        {completing && (
          <div style={{
            textAlign: "center", padding: "20px 0", animation: "up .3s ease",
          }}>
            <Spinner size={28} color={C.grn} />
            <p style={{ color: C.grn, fontSize: 14, fontWeight: 600, marginTop: 12 }}>
              Profile saved! Finding your matches...
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {!completing && (
        <div style={{
          padding: "12px 16px 24px", borderTop: `1px solid ${C.br}`,
          maxWidth: 640, width: "100%", margin: "0 auto", flexShrink: 0,
        }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button onClick={() => fileRef.current?.click()}
              style={{
                padding: "8px 14px", background: resumeFile ? C.grn + "22" : C.c2,
                color: resumeFile ? C.grn : C.t2, border: `1px solid ${resumeFile ? C.grn + "44" : C.br}`,
                borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: MONO, whiteSpace: "nowrap",
              }}>
              {resumeFile ? `${resumeFile.name.slice(0, 25)}` : "Upload Resume (PDF)"}
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} style={{ display: "none" }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Type your response..."
              style={{ flex: 1, fontSize: 15, padding: "13px 16px" }}
              disabled={loading}
            />
            <button onClick={send} disabled={loading || !input.trim()}
              style={{
                padding: "0 24px", background: loading ? C.c2 : C.grad,
                color: loading ? C.t3 : "#fff", border: "none", borderRadius: 8,
                fontSize: 14, fontWeight: 800, cursor: loading ? "wait" : "pointer",
              }}>
              Send
            </button>
          </div>
          <button
            onClick={async () => {
              // Skip onboarding — mark as complete with defaults
              await saveProfile({ onboarding_complete: true });
              navigate("/matches");
            }}
            style={{
              marginTop: 8, padding: "6px 0", background: "transparent", border: "none",
              color: C.t3, fontSize: 12, cursor: "pointer", width: "100%", textAlign: "center",
            }}
          >
            Skip setup (you can update your profile later)
          </button>
        </div>
      )}
    </div>
  );
}
