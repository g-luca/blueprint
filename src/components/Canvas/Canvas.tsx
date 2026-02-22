import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ConnectionMode,
} from '@xyflow/react';
import { useFlowStore } from '../../store/useFlowStore';
import { nodeTypes } from '../../nodes';
import { edgeTypes } from '../../edges';
import { useDrop } from '../../hooks/useDrop';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useThemeStore } from '../../store/useThemeStore';

export function Canvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useFlowStore();
  const { onDrop, onDragOver } = useDrop();
  const theme = useThemeStore((s) => s.theme);
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
      >
        {/* Fine subdivision — dots at every 20px intersection (matches snap grid) */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--color-canvas-grid-fine)"
        />
        {/* Major grid — lines every 100px (every 5 cells), rendered on top of dots */}
        <Background
          variant={BackgroundVariant.Lines}
          gap={100}
          color="var(--color-canvas-grid-major)"
          lineWidth={1}
        />
        <Controls showInteractive={false} />
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
