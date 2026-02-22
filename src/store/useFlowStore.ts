import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react';
import type { AppNode, BaseNodeData } from '../types/nodes';
import type { AppEdge, FlowEdgeData } from '../types/edges';
import { saveToLocalStorage, loadFromLocalStorage } from '../utils/persistence';
import { createId } from '../utils/id';

interface FlowState {
  nodes: AppNode[];
  edges: AppEdge[];
  clipboard: { nodes: AppNode[]; edges: AppEdge[] } | null;
  showGrid: boolean;
  toast: string | null;
  showToast: (msg: string) => void;
  toggleGrid: () => void;
  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<AppEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  setNodes: (nodes: AppNode[]) => void;
  setEdges: (edges: AppEdge[]) => void;
  addNode: (node: AppNode) => void;
  updateNodeLabel: (id: string, label: string) => void;
  updateNodeData: (id: string, patch: Partial<BaseNodeData>) => void;
  updateEdgeData: (id: string, patch: Partial<FlowEdgeData>) => void;
  selectAll: () => void;
  removeSelectedElements: () => void;
  copySelected: () => void;
  pasteClipboard: () => void;
  saveToStorage: () => void;
  loadFromStorage: () => void;
  clearCanvas: () => void;
}

const _saved = loadFromLocalStorage();

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: _saved?.nodes ?? [],
  edges: _saved?.edges ?? [],
  clipboard: null,
  showGrid: true,
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toast: null,
  showToast: (msg) => {
    set({ toast: msg });
    setTimeout(() => set({ toast: null }), 2000);
  },

  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) }),

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),

  onConnect: (connection) =>
    set({
      edges: addEdge(
        {
          ...connection,
          id: createId('edge'),
          type: 'flow',
          data: { protocol: 'http' },
        },
        get().edges
      ),
    }),

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (node) => set({ nodes: [...get().nodes, node] }),

  updateNodeLabel: (id, label) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, label } } : n
      ),
    }),

  updateNodeData: (id, patch) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n
      ),
    }),

  updateEdgeData: (id, patch) =>
    set({
      edges: get().edges.map((e) =>
        e.id === id ? { ...e, data: { ...e.data, ...patch } } : e
      ),
    }),

  selectAll: () =>
    set({
      nodes: get().nodes.map((n) => ({ ...n, selected: true })),
      edges: get().edges.map((e) => ({ ...e, selected: true })),
    }),

  removeSelectedElements: () =>
    set({
      nodes: get().nodes.filter((n) => !n.selected),
      edges: get().edges.filter((e) => !e.selected),
    }),

  copySelected: () => {
    const { nodes, edges } = get();
    const selectedNodes = nodes.filter((n) => n.selected);
    if (selectedNodes.length === 0) return;
    const selectedIds = new Set(selectedNodes.map((n) => n.id));
    // Include edges whose both endpoints are in the selection
    const selectedEdges = edges.filter(
      (e) => selectedIds.has(e.source) && selectedIds.has(e.target)
    );
    set({ clipboard: { nodes: selectedNodes, edges: selectedEdges } });
  },

  pasteClipboard: () => {
    const { clipboard, nodes, edges } = get();
    if (!clipboard || clipboard.nodes.length === 0) return;

    const OFFSET = 20;
    const idMap = new Map<string, string>();

    const newNodes: AppNode[] = clipboard.nodes.map((n) => {
      const newId = createId(n.type ?? 'node');
      idMap.set(n.id, newId);
      return {
        ...n,
        id: newId,
        position: { x: n.position.x + OFFSET, y: n.position.y + OFFSET },
        selected: true,
      };
    });

    const newEdges: AppEdge[] = clipboard.edges
      .filter((e) => idMap.has(e.source) && idMap.has(e.target))
      .map((e) => ({
        ...e,
        id: createId('edge'),
        source: idMap.get(e.source)!,
        target: idMap.get(e.target)!,
        selected: true,
      }));

    set({
      nodes: [...nodes.map((n) => ({ ...n, selected: false })), ...newNodes],
      edges: [...edges.map((e) => ({ ...e, selected: false })), ...newEdges],
      // Update clipboard to paste from the new positions next time
      clipboard: { nodes: newNodes, edges: newEdges },
    });
  },

  saveToStorage: () => {
    const { nodes, edges, showToast } = get();
    saveToLocalStorage(nodes, edges);
    showToast('Saved');
  },

  loadFromStorage: () => {
    const snapshot = loadFromLocalStorage();
    if (snapshot) {
      set({ nodes: snapshot.nodes, edges: snapshot.edges });
    }
  },

  clearCanvas: () => set({ nodes: [], edges: [] }),
}));
