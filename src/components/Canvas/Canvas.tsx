import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ConnectionMode,
  SelectionMode,
  useStore,
  useReactFlow,
} from '@xyflow/react';
import { useFlowStore } from '../../store/useFlowStore';
import { nodeTypes } from '../../nodes';
import { edgeTypes } from '../../edges';
import { useDrop } from '../../hooks/useDrop';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useThemeStore } from '../../store/useThemeStore';
import { EdgePanel } from '../../edges/EdgePanel';
import { NodePanel, LinePanel } from '../../nodes/NodePanel';
import { EndpointPanel } from '../../nodes/EndpointPanel';
import type { FlowEdgeData } from '../../types/edges';
import type { BaseNodeData } from '../../types/nodes';

// Fixed-position inspector panel shown when a node is selected
function SelectedNodePanel() {
  const selectedNode = useStore((s) => s.nodes.find((n) => n.selected));
  if (!selectedNode) return null;
  if (selectedNode.type === 'endpoint') {
    return (
      <div className="nodrag nopan" style={{ position: 'absolute', top: 16, right: 16, zIndex: 1000, pointerEvents: 'all' }}>
        <EndpointPanel id={selectedNode.id} data={selectedNode.data as BaseNodeData} />
      </div>
    );
  }
  if (selectedNode.type === 'line') {
    return (
      <div className="nodrag nopan" style={{ position: 'absolute', top: 16, right: 16, zIndex: 1000, pointerEvents: 'all' }}>
        <LinePanel id={selectedNode.id} data={selectedNode.data as BaseNodeData} />
      </div>
    );
  }
  return (
    <div
      className="nodrag nopan"
      style={{ position: 'absolute', top: 16, right: 16, zIndex: 1000, pointerEvents: 'all' }}
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
      style={{ position: 'absolute', top: 16, right: 16, zIndex: 1000, pointerEvents: 'all' }}
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

type SelBox = { x: number; y: number; w: number; h: number };

export function Canvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, showGrid, saveSnapshot } = useFlowStore();
  const { onDrop, onDragOver } = useDrop();
  const theme = useThemeStore((s) => s.theme);
  const gridColors = GRID_COLORS[theme];
  const { screenToFlowPosition, getIntersectingNodes, getNodes } = useReactFlow();
  useKeyboardShortcuts();

  // Cmd held → disable snap-to-grid for free positioning
  const [cmdHeld, setCmdHeld] = useState(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Meta' || e.key === 'Control') setCmdHeld(true);  };
    const up   = (e: KeyboardEvent) => { if (e.key === 'Meta' || e.key === 'Control') setCmdHeld(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup',   up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // Right-click drag → marquee selection
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const [selBox, setSelBox] = useState<SelBox | null>(null);
  const [crosshair, setCrosshair] = useState(false);

  useEffect(() => {
    if (!crosshair) return;
    const style = document.createElement('style');
    style.textContent = '.react-flow__pane, .react-flow__renderer { cursor: crosshair !important; }';
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, [crosshair]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 2) return;
    // Only start when clicking the canvas background, not a node/edge
    const target = e.target as HTMLElement;
    if (target.closest('.react-flow__node') || target.closest('.react-flow__edge')) return;
    e.preventDefault();
    dragStart.current = { x: e.clientX, y: e.clientY };
    setCrosshair(true);
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragStart.current) return;
    const { x: sx, y: sy } = dragStart.current;
    setSelBox({
      x: Math.min(sx, e.clientX),
      y: Math.min(sy, e.clientY),
      w: Math.abs(e.clientX - sx),
      h: Math.abs(e.clientY - sy),
    });
  }, []);

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button !== 2) return;
    setSelBox((box) => {
      if (dragStart.current && box && (box.w > 4 || box.h > 4)) {
        const tl = screenToFlowPosition({ x: box.x,         y: box.y });
        const br = screenToFlowPosition({ x: box.x + box.w, y: box.y + box.h });
        const intersecting = getIntersectingNodes({ x: tl.x, y: tl.y, width: br.x - tl.x, height: br.y - tl.y });
        const ids = new Set(intersecting.map((n) => n.id));
        const changes = getNodes().map((n) => ({ id: n.id, type: 'select' as const, selected: ids.has(n.id) }));
        onNodesChange(changes);
      }
      dragStart.current = null;
      setCrosshair(false);
      return null;
    });
  }, [screenToFlowPosition, getIntersectingNodes, getNodes, onNodesChange]);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    // Suppress browser context menu when a drag just happened
    if (dragStart.current !== null || selBox !== null) e.preventDefault();
  }, [selBox]);

  return (
    <div
      style={{ flex: 1, height: '100%', position: 'relative' }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onContextMenu={onContextMenu}
    >
      {/* Right-click drag selection rectangle */}
      {selBox && selBox.w > 4 && selBox.h > 4 && (
        <div style={{
          position: 'fixed',
          left: selBox.x, top: selBox.y,
          width: selBox.w, height: selBox.h,
          border: '1px solid var(--color-selection-ring)',
          background: 'rgba(99,102,241,0.08)',
          pointerEvents: 'none',
          zIndex: 9999,
        }} />
      )}

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
        snapToGrid={!cmdHeld}
        snapGrid={[20, 20]}
        panOnDrag={true}
        selectionOnDrag={false}
        selectionMode={SelectionMode.Partial}
        onNodeDragStart={saveSnapshot}
      >
        {showGrid && <>
          <Background variant={BackgroundVariant.Lines} gap={20} lineWidth={0.4} color={gridColors.fine} />
          <Background variant={BackgroundVariant.Lines} gap={100} lineWidth={1} color={gridColors.major} />
        </>}
        <SelectedNodePanel />
        <SelectedEdgePanel />
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
