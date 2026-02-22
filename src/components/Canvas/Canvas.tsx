import { useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  ControlButton,
  MiniMap,
  ConnectionMode,
  SelectionMode,
  useStore,
} from '@xyflow/react';
import { BsBoundingBoxCircles } from 'react-icons/bs';
import { MdPanTool } from 'react-icons/md';
import { useFlowStore } from '../../store/useFlowStore';
import { nodeTypes } from '../../nodes';
import { edgeTypes } from '../../edges';
import { useDrop } from '../../hooks/useDrop';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useThemeStore } from '../../store/useThemeStore';
import { EdgePanel } from '../../edges/EdgePanel';
import { NodePanel } from '../../nodes/NodePanel';
import type { FlowEdgeData } from '../../types/edges';
import type { BaseNodeData } from '../../types/nodes';

// Fixed-position inspector panel shown when a node is selected
function SelectedNodePanel() {
  const selectedNode = useStore((s) => s.nodes.find((n) => n.selected));
  if (!selectedNode) return null;
  return (
    <div
      className="nodrag nopan"
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
        pointerEvents: 'all',
      }}
    >
      <NodePanel id={selectedNode.id} data={selectedNode.data as BaseNodeData} />
    </div>
  );
}

// Fixed-position inspector panel shown when an edge is selected
function SelectedEdgePanel() {
  const selectedEdge = useStore((s) => s.edges.find((e) => e.selected));
  if (!selectedEdge) return null;
  return (
    <div
      className="nodrag nopan"
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
        pointerEvents: 'all',
      }}
    >
      <EdgePanel id={selectedEdge.id} data={(selectedEdge.data ?? {}) as Partial<FlowEdgeData>} />
    </div>
  );
}

// SVG doesn't resolve CSS custom properties, so grid colors must be real values
const GRID_COLORS: Record<string, { fine: string; major: string }> = {
  blueprint: { fine: 'rgba(59,79,255,0.18)',   major: 'rgba(59,79,255,0.35)' },
  dark:      { fine: 'rgba(255,255,255,0.10)', major: 'rgba(255,255,255,0.18)' },
  light:     { fine: 'rgba(0,0,0,0.10)',       major: 'rgba(0,0,0,0.18)'     },
};

export function Canvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, showGrid } = useFlowStore();
  const { onDrop, onDragOver } = useDrop();
  const theme = useThemeStore((s) => s.theme);
  const gridColors = GRID_COLORS[theme];
  const [isSelecting, setIsSelecting] = useState(false);
  useKeyboardShortcuts();

  return (
    <div
      style={{ flex: 1, height: '100%', position: 'relative' }}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={{ type: 'flow' }}
        style={{ background: 'var(--color-canvas-bg)' }}
        deleteKeyCode={null}
        snapToGrid={true}
        snapGrid={[20, 20]}
        selectionOnDrag={isSelecting}
        panOnDrag={isSelecting ? [2] : true}
        selectionMode={SelectionMode.Partial}
      >
        {showGrid && <>
          <Background variant={BackgroundVariant.Lines} gap={20} lineWidth={0.4} color={gridColors.fine} />
          <Background variant={BackgroundVariant.Lines} gap={100} lineWidth={1} color={gridColors.major} />
        </>}
        <SelectedNodePanel />
        <SelectedEdgePanel />
        <Controls showInteractive={false}>
          <ControlButton
            onClick={() => setIsSelecting((s) => !s)}
            title={isSelecting ? 'Switch to pan mode' : 'Switch to selection mode'}
            style={{ color: isSelecting ? 'var(--color-selection-ring)' : undefined }}
          >
            {isSelecting ? <BsBoundingBoxCircles size={13} /> : <MdPanTool size={13} />}
          </ControlButton>
        </Controls>
        <MiniMap
          nodeColor="var(--color-minimap-node)"
          maskColor="var(--color-minimap-bg)"
          style={{
            background: 'var(--color-minimap-bg)',
            border: '1px solid var(--color-node-border)',
            borderRadius: '8px',
          }}
        />
      </ReactFlow>
    </div>
  );
}
