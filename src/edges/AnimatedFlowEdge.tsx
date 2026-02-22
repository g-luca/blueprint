import {
  getBezierPath,
  getSmoothStepPath,
  EdgeLabelRenderer,
  Position,
  type EdgeProps,
} from '@xyflow/react';
import type { AppEdge, FlowEdgeData } from '../types/edges';
import { EDGE_COLOR_VALUES } from '../types/edges';
import { useThemeStore } from '../store/useThemeStore';
import { EdgePanel } from './EdgePanel';

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
  id,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data, selected,
}: EdgeProps<AppEdge>) {
  const theme = useThemeStore((s) => s.theme);
  const edgeData = (data ?? {}) as Partial<FlowEdgeData>;

  // Properties with defaults
  const colorKey    = edgeData.color       ?? 'default';
  const widthKey    = edgeData.strokeWidth ?? 'medium';
  const styleKey    = edgeData.strokeStyle ?? 'dashed';
  const routing     = edgeData.routing     ?? 'step';
  const showArrow   = edgeData.arrowhead   ?? true;

  // Resolved values
  const strokeColor = theme === 'blueprint'
    ? 'var(--color-edge-stroke)'
    : EDGE_COLOR_VALUES[colorKey];
  const dotColor = theme === 'blueprint'
    ? 'var(--color-edge-dot)'
    : strokeColor;
  const strokeWidth   = STROKE_WIDTH[widthKey];
  const strokeDash    = STROKE_DASH[styleKey];
  const strokeOpacity = selected ? 1 : 0.75;

  // Path generation
  const pathArgs = { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition };
  const [edgePath, labelX, labelY] =
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

      {/* Animated dots */}
      {[0, 0.6, 1.2].map((delay, i) => (
        <circle key={i} r="3" fill={dotColor} opacity="0.9">
          <animateMotion
            dur="1.8s"
            repeatCount="indefinite"
            begin={`${delay}s`}
            calcMode="spline"
            keySplines="0.4 0 0.6 1"
            keyTimes="0;1"
          >
            <mpath href={`#${id}`} />
          </animateMotion>
        </circle>
      ))}

      {/* Options panel — floats above the edge midpoint when selected */}
      {selected && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, calc(-100% - 14px)) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 1000,
            }}
          >
            <EdgePanel id={id} data={edgeData} />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
