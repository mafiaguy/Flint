import { useState } from 'react';
import { sb } from '../../api';
import { C } from '../../theme';
import Modal from '../ui/Modal';

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
    <Modal onClose={onClose}>
      <div style={{ textAlign: "center", padding: "10px 0" }}>
        <span style={{ fontSize: 40 }}>{"\u{1F525}"}</span>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: C.t1, margin: "12px 0 4px" }}>
          Sign in to FLINT
        </h2>
        <p style={{ color: C.t2, fontSize: 14, marginBottom: 28 }}>
          Your data stays private.
        </p>
        <button
          onClick={() => go("google")}
          disabled={!!loading}
          style={{
            width: "100%", padding: 14, background: "#fff", color: "#333",
            border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600,
            cursor: loading ? "wait" : "pointer", marginBottom: 10,
          }}
        >
          Continue with Google
        </button>
        <button
          onClick={() => go("github")}
          disabled={!!loading}
          style={{
            width: "100%", padding: 14, background: C.c2, color: C.t1,
            border: `1px solid ${C.br}`, borderRadius: 10, fontSize: 15,
            fontWeight: 600, cursor: loading ? "wait" : "pointer",
          }}
        >
          Continue with GitHub
        </button>
      </div>
    </Modal>
  );
}
