import { C } from '../../theme';

export default function Modal({ children, onClose }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.7)",
        backdropFilter: "blur(8px)", zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, animation: "fadeIn .2s",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: C.c1, border: `1px solid ${C.br}`, borderRadius: 12,
          maxWidth: 520, width: "100%", maxHeight: "88vh", overflow: "auto",
          padding: 24, animation: "up .2s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}
