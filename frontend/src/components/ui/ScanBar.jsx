import { C } from '../../theme';

export default function ScanBar() {
  return (
    <div style={{ height: 2, background: C.c2, borderRadius: 1, overflow: "hidden", margin: "10px 0" }}>
      <div style={{ height: "100%", width: "30%", background: C.grad, animation: "scan 1.4s ease infinite" }} />
    </div>
  );
}
