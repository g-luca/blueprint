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
        {showGrid && <>
          <Background variant={BackgroundVariant.Lines} gap={20} lineWidth={0.4} color={gridColors.fine} />
          <Background variant={BackgroundVariant.Lines} gap={100} lineWidth={1} color={gridColors.major} />
        </>}
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
