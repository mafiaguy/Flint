import { useState } from 'react';
import { sb } from '@/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function AuthModal({ onClose }) {
  const [loading, setLoading] = useState(null);

  const go = async (provider) => {
    setLoading(provider);
    await sb.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <Card className="w-full max-w-sm p-8 text-center animate-in fade-in-0 zoom-in-95">
        <h2 className="mb-1 text-xl font-bold">Sign in to flint</h2>
        <p className="mb-6 text-sm text-muted-foreground">Your data stays private.</p>
        <div className="flex flex-col gap-2.5">
          <Button variant="outline" onClick={() => go('google')} disabled={!!loading} className="w-full">
            Continue with Google
          </Button>
          <Button variant="outline" onClick={() => go('github')} disabled={!!loading} className="w-full">
            Continue with GitHub
          </Button>
        </div>
      </Card>
    </div>
  );
}
