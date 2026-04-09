import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { db } from '@/api';
import useStore from '@/store';

const FIRST_MESSAGE = (name) =>
  `Hey${name ? ` ${name}` : ''}! I'm flint, your job search agent.\n\nI'll match you with the best jobs from 10,000+ listings. But first, I need to know what you're looking for.\n\nWhat kind of role are you targeting?`;

export default function Onboarding() {
  const navigate = useNavigate();
  const { profile, saveProfile } = useStore();

  const [messages, setMessages] = useState([]);
  const [llmHistory, setLlmHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [completing, setCompleting] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ role: 'assistant', content: FIRST_MESSAGE(profile?.name?.split(' ')[0] || '') }]);
    }
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');

    const updated = [...messages, { role: 'user', content: userMsg }];
    setMessages(updated);
    const updatedHistory = [...llmHistory, { role: 'user', content: userMsg }];
    setLlmHistory(updatedHistory);
    db.saveOnboardingMessage('user', userMsg);
    setLoading(true);

    const res = await db.callAI({ type: 'onboard', messages: updatedHistory, profile });
    const aiText = res?.text || 'Sorry, could you try that again?';

    setMessages((prev) => [...prev, { role: 'assistant', content: aiText }]);
    setLlmHistory((prev) => [...prev, { role: 'assistant', content: aiText }]);
    db.saveOnboardingMessage('assistant', aiText);

    const jsonMatch = aiText.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.complete && parsed.profile) {
          setCompleting(true);
          await saveProfile({ ...parsed.profile, experience: String(parsed.profile.experience || ''), onboarding_complete: true });
          setTimeout(() => navigate('/matches'), 2000);
        }
      } catch { /* still conversing */ }
    }
    setLoading(false);
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFile(file);
    const url = await db.uploadResume(file);
    if (url) {
      setMessages((prev) => [...prev, { role: 'system', content: `Resume uploaded: ${file.name}` }]);
      db.parseResume(url);
    }
  };

  const cleanMessage = (text) => text.replace(/```json[\s\S]*?```/g, '').trim();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b px-5 py-3">
        <span className="text-sm font-extrabold">flint</span>
        <span className="text-xs text-muted-foreground">Setup</span>
      </div>

      <p className="shrink-0 border-b px-5 py-2 text-xs text-muted-foreground">
        Tell me about yourself and I'll find your perfect matches. Upload your resume anytime.
      </p>

      {/* Chat */}
      <div className="flex-1 overflow-auto px-5 py-5 max-w-2xl w-full mx-auto">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-3 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'system' ? (
              <p className="w-full text-center text-xs text-green-400 py-1">{msg.content}</p>
            ) : (
              <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-card border rounded-bl-sm'
              }`}>
                {msg.role === 'assistant' && <span className="mb-1 block text-xs font-semibold text-muted-foreground">flint</span>}
                <span className="whitespace-pre-wrap">{cleanMessage(msg.content) || 'Setting up your profile...'}</span>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 py-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />
            <span className="text-xs text-muted-foreground animate-pulse">Reading between the lines of your message...</span>
          </div>
        )}
        {completing && (
          <div className="py-6 text-center animate-in fade-in">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-green-400" />
            <p className="mt-3 text-sm font-medium text-green-400">Profile saved! Scanning 10,000+ jobs for you...</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!completing && (
        <div className="shrink-0 border-t px-5 py-4 max-w-2xl w-full mx-auto">
          <div className="mb-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              {resumeFile ? resumeFile.name.slice(0, 25) : 'Upload Resume (PDF)'}
            </Button>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} className="hidden" />
          </div>
          <div className="flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Type your response..." disabled={loading} className="flex-1" />
            <Button onClick={send} disabled={loading || !input.trim()}>Send</Button>
          </div>
          <button onClick={async () => { await saveProfile({ onboarding_complete: true }); navigate('/matches'); }}
            className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-none">
            Skip setup (update later)
          </button>
        </div>
      )}
    </div>
  );
}
