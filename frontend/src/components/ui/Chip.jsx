import { C, MONO } from '../../theme';

export default function Chip({ active, color = C.acc, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 14px",
        fontSize: 12,
        border: `1px solid ${active ? color + "55" : C.br}`,
        borderRadius: 99,
        background: active ? color + "15" : "transparent",
        color: active ? color : C.t3,
        cursor: "pointer",
        fontWeight: 500,
        fontFamily: MONO,
        transition: "all .15s",
      }}
    >
      {children}
    </button>
  );
}
