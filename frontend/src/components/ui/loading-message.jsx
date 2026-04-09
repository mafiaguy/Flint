import { useState, useEffect } from 'react';

const MESSAGES = {
  matching: [
    "Scanning 10,000+ jobs against your profile...",
    "Comparing your skills to open positions...",
    "Running match scores through the AI...",
    "Finding roles that actually deserve you...",
    "Crunching numbers across 9 job sources...",
    "Your resume is impressive, this might take a sec...",
  ],
  cover: [
    "Crafting something that doesn't sound like a template...",
    "Writing a letter that actually gets read...",
    "Translating your experience into their language...",
    "Making the hiring manager's day a little better...",
    "Weaving your achievements into a narrative...",
    "This cover letter won't start with 'I am writing to apply'...",
  ],
  suggestions: [
    "Comparing your resume line-by-line against the JD...",
    "Finding the gaps between what you have and what they want...",
    "Identifying keywords you're missing...",
    "Analyzing which experiences to highlight...",
    "Reading between the lines of the job description...",
    "Figuring out what the hiring manager really cares about...",
  ],
  latex: [
    "Converting your career into beautiful LaTeX...",
    "Typesetting your experience with precision...",
    "Making pdflatex proud...",
    "Building a resume that compiles on the first try...",
    "Structuring sections, bullet points, and dates...",
    "Your resume is about to look publication-ready...",
  ],
  rewriting: [
    "Rewriting bullet points to match the role...",
    "Keeping your facts, sharpening the framing...",
    "Emphasizing what matters for this specific job...",
    "Restructuring without inventing anything new...",
    "Making subtle but impactful changes...",
    "Tailoring the language to their tech stack...",
  ],
  skills: [
    "Analyzing skill gaps across your top matches...",
    "Figuring out what to learn next...",
    "Mapping your skills against market demand...",
    "Crunching data from your job matches...",
  ],
  salary: [
    "Pulling market rates from recent postings...",
    "Aggregating salary data for your role...",
    "Calculating percentiles from real job data...",
    "Finding out what you're worth (spoiler: a lot)...",
  ],
  prep: [
    "Researching the company and role...",
    "Preparing questions they'll probably ask...",
    "Building your interview battle plan...",
    "Compiling talking points from your experience...",
  ],
  general: [
    "Working on it...",
    "Almost there...",
    "Thinking really hard about this...",
    "Doing the thing...",
  ],
  pdf: [
    "Rendering your resume into a beautiful PDF...",
    "Laying out pages with pixel precision...",
    "Generating a document worthy of your career...",
  ],
  onboarding: [
    "Getting to know you better...",
    "Processing your profile details...",
    "Understanding your career goals...",
  ],
};

export function useLoadingMessage(category = 'general', intervalMs = 3500) {
  const msgs = MESSAGES[category] || MESSAGES.general;
  const [index, setIndex] = useState(() => Math.floor(Math.random() * msgs.length));

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % msgs.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [msgs.length, intervalMs]);

  return msgs[index];
}

export default function LoadingMessage({ category = 'general', className = '' }) {
  const message = useLoadingMessage(category);

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      <p className="text-xs text-muted-foreground animate-pulse transition-all duration-300">{message}</p>
    </div>
  );
}
