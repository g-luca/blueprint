
// ─── Height constants ─────────────────────────────────────────────────────────
// Each replica row is 20 px (border-box). The BaseNode footer wrapper adds
// 11 px of overhead (marginTop:5 + border:1 + paddingTop:5). We add 9 px of
// paddingBottom so the total footer area is always a clean multiple of 20:
//   footer = 11 + n*20 + 9 = (n+1)*20
// Total stored height = 40 (main card) + (n+1)*20  →  (n+3)*20
// n=0 ⇒ 40  |  n=1 ⇒ 80  |  n=2 ⇒ 100  |  n=3 ⇒ 120  …
export function replicaNodeHeight(n: number): number {
  return n === 0 ? 40 : (n + 3) * 20;
}

// ─── Replica rows (rendered in BaseNode's footer slot) ────────────────────────

interface ReplicaRowsProps {
  count: number;
  icon: React.ReactNode;
}

export function ReplicaRows({ count, icon }: ReplicaRowsProps) {
  if (count === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 9 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'relative',
            boxSizing: 'border-box',
            height: 20,
            display: 'flex', alignItems: 'center', gap: 6,
            borderTop: i > 0 ? '1px solid rgba(128,128,128,0.12)' : 'none',
            opacity: 0.7,
          }}
        >
          <span style={{ display: 'flex', flexShrink: 0, opacity: 0.8 }}>{icon}</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-node-text)' }}>
            Replica {i + 1}
          </span>
        </div>
      ))}
    </div>
  );
}
