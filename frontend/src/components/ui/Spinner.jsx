import { C } from '../../theme';

export default function Spinner({ size = 36, color = C.acc }) {
  return (
    <div
      style={{
        width: size, height: size,
        border: `3px solid ${C.br}`,
        borderTopColor: color,
        borderRadius: "50%",
        animation: "spin .8s linear infinite",
      }}
    />
  );
}
