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
  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<AppEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  setNodes: (nodes: AppNode[]) => void;
  setEdges: (edges: AppEdge[]) => void;
  addNode: (node: AppNode) => void;
  updateNodeLabel: (id: string, label: string) => void;
  updateNodeData: (id: string, patch: Partial<BaseNodeData>) => void;
  updateEdgeData: (id: string, patch: Partial<FlowEdgeData>) => void;
  removeSelectedElements: () => void;
  saveToStorage: () => void;
  loadFromStorage: () => void;
  clearCanvas: () => void;
}

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],

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

  removeSelectedElements: () =>
    set({
      nodes: get().nodes.filter((n) => !n.selected),
      edges: get().edges.filter((e) => !e.selected),
    }),

  saveToStorage: () => {
    const { nodes, edges } = get();
    saveToLocalStorage(nodes, edges);
  },

  loadFromStorage: () => {
    const snapshot = loadFromLocalStorage();
    if (snapshot) {
      set({ nodes: snapshot.nodes, edges: snapshot.edges });
    }
  },

  clearCanvas: () => set({ nodes: [], edges: [] }),
}));
