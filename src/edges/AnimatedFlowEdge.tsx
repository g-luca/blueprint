import {
  getBezierPath,
  getSmoothStepPath,
  Position,
  useStore,
  type EdgeProps,
} from '@xyflow/react';
import type { AppEdge, FlowEdgeData } from '../types/edges';
import { EDGE_COLOR_VALUES } from '../types/edges';
import { computeEffectiveTps } from '../utils/graphTps';

// Compute dot parameters from k-TPS (1 = 1k TPS = 1 dot/s)
// TRAVEL_DUR is how long one dot takes to cross an edge (seconds).
const TRAVEL_DUR = 1.5;

function dotsFromTps(tps: number): { dur: number; begins: number[] } {
  const dotsPerSecond = Math.max(tps, 0.01);
  const interval = 1 / dotsPerSecond;
  const numDots = Math.min(10, Math.max(1, Math.ceil(TRAVEL_DUR / interval)));
  const dur = numDots * interval;
  const begins = Array.from({ length: numDots }, (_, i) => i * interval);
  return { dur, begins };
}

// Simple non-cryptographic hash of a string → 0..1
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return (h >>> 0) / 4294967295;
}

// Maps edgeIndex → stagger slot based on lb policy
function staggerSlot(
  policy: string,
  edgeIndex: number,
  numOutgoing: number,
  edgeId: string,
): number {
  switch (policy) {
    // Random: deterministic pseudo-random slot per edge
    case 'random':
      return Math.floor(hash01(edgeId) * numOutgoing);

    // IP Hash: hash by edge target (simulates client affinity to a backend)
    case 'ip-hash':
      return Math.floor(hash01('iphash:' + edgeId) * numOutgoing);

    // Least Connections: favour lower-index edges (first half gets ~double traffic)
    // Simulate by mapping: first half of edges share slot 0, rest get sequential
    case 'least-conn': {
      const half = Math.ceil(numOutgoing / 2);
      return edgeIndex < half ? 0 : edgeIndex - half + 1;
    }

    // Round Robin (default): strict sequential
    case 'round-robin':
    default:
      return edgeIndex;
  }
}


// ─── Arrowhead ────────────────────────────────────────────────────────────────

function arrowPoints(tx: number, ty: number, pos: Position, size = 9): string {
  const dir: Record<Position, [number, number]> = {
    [Position.Top]:    [0,  1],
    [Position.Bottom]: [0, -1],
    [Position.Left]:   [1,  0],
    [Position.Right]:  [-1, 0],
  };
  const [dx, dy] = dir[pos] ?? [0, -1];
  const half = size * 0.45;
  const bx = tx - dx * size;
  const by = ty - dy * size;
  return [
    `${tx},${ty}`,
    `${bx + (-dy) * half},${by + dx * half}`,
    `${bx - (-dy) * half},${by - dx * half}`,
  ].join(' ');
}

// ─── Stroke maps ─────────────────────────────────────────────────────────────

const STROKE_WIDTH = { thin: 1, medium: 1.5, thick: 2.5 };
const STROKE_DASH  = { solid: undefined, dashed: '6 3', dotted: '1.5 4' };

// ─── Component ───────────────────────────────────────────────────────────────

export function AnimatedFlowEdge({
  id, source,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data, selected,
}: EdgeProps<AppEdge>) {
  const edgeData = (data ?? {}) as Partial<FlowEdgeData>;

  // Properties with defaults
  const colorKey  = edgeData.color       ?? 'default';
  const widthKey  = edgeData.strokeWidth ?? 'medium';
  const styleKey  = edgeData.strokeStyle ?? 'solid';
  const routing   = edgeData.routing     ?? 'smoothstep';
  const showArrow = edgeData.arrowhead   ?? true;

  // Effective TPS + stagger info for this edge
  const { isActive, sourceTps, edgeIndex, numOutgoing, lbPolicy } = useStore((s) => {
    const tpsMap = computeEffectiveTps(s.nodes, s.edges);
    const sNodeTps = tpsMap.get(source);
    if (sNodeTps === undefined) return { isActive: false, sourceTps: 1, edgeIndex: 0, numOutgoing: 1, lbPolicy: 'round-robin' };

    const activeSet = new Set(tpsMap.keys());
    const outgoing  = s.edges.filter((e) => e.source === source && activeSet.has(e.target));
    const idx       = outgoing.findIndex((e) => e.id === id);
    const sourceNode = s.nodes.find((n) => n.id === source);
    const policy     = (sourceNode?.data?.lbPolicy as string | undefined) ?? 'round-robin';

    return { isActive: true, sourceTps: sNodeTps, edgeIndex: Math.max(0, idx), numOutgoing: Math.max(1, outgoing.length), lbPolicy: policy };
  });

  // Resolved values
  const strokeColor =
    colorKey === 'custom' && edgeData.customColor
      ? edgeData.customColor
      : EDGE_COLOR_VALUES[colorKey];
  const dotColor = strokeColor;
  const strokeWidth   = STROKE_WIDTH[widthKey];
  const strokeDash    = STROKE_DASH[styleKey];
  const strokeOpacity = selected ? 1 : 0.75;

  // Path generation
  const pathArgs = { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition };
  const [edgePath] =
    routing === 'bezier'     ? getBezierPath(pathArgs) :
    routing === 'smoothstep' ? getSmoothStepPath({ ...pathArgs, borderRadius: 8 }) :
                               getSmoothStepPath({ ...pathArgs, borderRadius: 0 });

  return (
    <>
      {/* Main path */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={strokeOpacity}
        strokeDasharray={strokeDash}
      />

      {/* Arrowhead */}
      {showArrow && (
        <polygon
          points={arrowPoints(targetX, targetY, targetPosition)}
          fill={strokeColor}
          opacity={strokeOpacity}
        />
      )}

      {/* Animated dots — staggered by LB policy */}
      {isActive && (() => {
        const edgeTps     = sourceTps / numOutgoing;
        const { dur, begins } = dotsFromTps(edgeTps);
        const slot        = staggerSlot(lbPolicy, edgeIndex, numOutgoing, id);
        const phaseOffset = slot / Math.max(sourceTps, 0.01);
        return begins.map((delay, i) => (
          <circle key={i} r="3" fill={dotColor} opacity="0.9">
            <animateMotion
              dur={`${dur.toFixed(3)}s`}
              repeatCount="indefinite"
              begin={`${(delay + phaseOffset).toFixed(3)}s`}
              calcMode="spline"
              keySplines="0.4 0 0.6 1"
              keyTimes="0;1"
            >
              <mpath href={`#${id}`} />
            </animateMotion>
          </circle>
        ));
      })()}

    </>
  );
}
