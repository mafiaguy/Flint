import { C } from '../../theme';

export default function Modal({ children, onClose }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.8)",
        backdropFilter: "blur(12px)", zIndex: 200,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        padding: 0, animation: "fadeIn .2s",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: C.c1, border: `1px solid ${C.br}`,
          borderRadius: "20px 20px 0 0",
          maxWidth: 560, width: "100%", maxHeight: "92vh", overflow: "auto",
          padding: "24px 20px", animation: "up .3s ease",
          // On larger screens, center the modal
          ...(typeof window !== 'undefined' && window.innerWidth > 560
            ? { borderRadius: 20, margin: 'auto', maxHeight: '88vh', padding: 28 }
            : {}),
        }}
      >
        {children}
      </div>
    </div>
  );
}
