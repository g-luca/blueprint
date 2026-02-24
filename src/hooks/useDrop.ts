import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { NodeType, BaseNodeData, AppNode } from '../types/nodes';
import { createId } from '../utils/id';
import { NODE_DEFAULT_LABELS, NODE_DEFAULT_DATA, NODE_DIMENSIONS } from '../utils/nodeDefaults';
import { useFlowStore } from '../store/useFlowStore';

const SNAP = 20;
const snap = (v: number) => Math.round(v / SNAP) * SNAP;

export function useDrop() {
  const { screenToFlowPosition } = useReactFlow();
  const addNode = useFlowStore((s) => s.addNode);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/blueprint-node') as NodeType;
      if (!type) return;

      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const { width, height } = NODE_DIMENSIONS[type];

      const node: AppNode = {
        id: createId(type),
        type,
        // Snap top-left corner to grid so the node sits exactly on grid lines
        position: {
          x: snap(pos.x - width / 2),
          y: snap(pos.y - height / 2),
        },
        // Explicit initial dimensions so NodeResizer has a starting size
        width,
        height,
        data: { label: NODE_DEFAULT_LABELS[type], ...NODE_DEFAULT_DATA[type] } satisfies BaseNodeData,
      };

      addNode(node);
    },
    [screenToFlowPosition, addNode]
  );

  return { onDrop, onDragOver };
}
