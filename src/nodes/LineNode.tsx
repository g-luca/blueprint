import { NodeResizer, useReactFlow } from '@xyflow/react';
import type { NodeProps, ResizeDragEvent, ResizeParams } from '@xyflow/react';
import type { AppNode } from '../types/nodes';

const GRID = 20;
const snap = (v: number) => Math.round(v / GRID) * GRID;

type Orientation = 'h' | 'v' | 'd1' | 'd2';

const LINE_COORDS: Record<Orientation, [number, number, number, number]> = {
  h:  [0,   50, 100,  50],
  v:  [50,   0,  50, 100],
  d1: [0,    0, 100, 100],
  d2: [100,  0,   0, 100],
};

export function LineNode({ id, data, selected }: NodeProps<AppNode>) {
  const { updateNode } = useReactFlow();

  const orientation = ((data.lineOrientation as Orientation | undefined) ?? 'h');
  const strokeStyle  = (data.strokeStyle as string | undefined) ?? 'solid';

  const [x1, y1, x2, y2] = LINE_COORDS[orientation];
  const dasharray =
    strokeStyle === 'dotted' ? '2 5' :
    strokeStyle === 'dashed' ? '8 5' :
    undefined;

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={20}
        minHeight={20}
        onResizeEnd={(_: ResizeDragEvent, p: ResizeParams) => {
          updateNode(id, {
            position: { x: snap(p.x), y: snap(p.y) },
            width:    snap(p.width),
            height:   snap(p.height),
          });
        }}
        lineStyle={{ stroke: 'var(--color-selection-ring)', strokeWidth: 1, strokeDasharray: '3 2', opacity: 0.6 }}
        handleStyle={{
          background: 'var(--color-canvas-bg)',
          border: '1px solid var(--color-selection-ring)',
          width: 6, height: 6, borderRadius: 1,
        }}
      />

      <svg
        width="100%" height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Selection glow */}
        {selected && (
          <line
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="var(--color-selection-ring)"
            strokeWidth={8}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            opacity={0.25}
          />
        )}
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="var(--color-node-border)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={dasharray}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </>
  );
}
