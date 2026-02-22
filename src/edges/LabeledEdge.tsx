import { getBezierPath, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';
import type { AppEdge, FlowEdgeData } from '../types/edges';
import { PROTOCOL_COLORS } from '../types/edges';
import { useThemeStore } from '../store/useThemeStore';

export function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<AppEdge>) {
  const theme = useThemeStore((s) => s.theme);
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  const edgeData = data as FlowEdgeData | undefined;
  const protocol = edgeData?.protocol ?? 'generic';
  const strokeColor =
    theme === 'blueprint' ? 'var(--color-edge-stroke)' : PROTOCOL_COLORS[protocol];

  return (
    <>
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={selected ? 2 : 1.5}
        strokeOpacity={selected ? 1 : 0.7}
        strokeDasharray="8 4"
      />
      {edgeData?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: 'var(--color-node-bg)',
              border: '1px solid var(--color-node-border)',
              color: 'var(--color-node-text)',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '10px',
              fontWeight: 600,
              pointerEvents: 'all',
            }}
          >
            {edgeData.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
