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
import { loadFromLocalStorage, getAllFiles, upsertFile, removeFile, parseExport, getLastFileId, setLastFileId, type SavedFile } from '../utils/persistence';
import { createId } from '../utils/id';

type Snapshot = { nodes: AppNode[]; edges: AppEdge[] };
const MAX_HISTORY = 50;

interface FlowState {
  nodes: AppNode[];
  edges: AppEdge[];
  past: Snapshot[];
  future: Snapshot[];
  clipboard: { nodes: AppNode[]; edges: AppEdge[] } | null;
  showGrid: boolean;
  toast: string | null;
  // File management
  currentFileId: string | null;
  currentFileName: string | null;
  files: SavedFile[];
  needsNamePrompt: boolean;
  showToast: (msg: string) => void;
  toggleGrid: () => void;
  // Internal — call before any mutation that should be undoable
  saveSnapshot: () => void;
  undo: () => void;
  redo: () => void;
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
  // File actions
  saveToStorage: () => void;        // save in-place or prompt for name
  saveFile: (name: string) => void; // save/update current file
  saveAsFile: (name: string) => void; // always creates a new file
  loadFile: (id: string) => void;
  deleteFile: (id: string) => void;
  newCanvas: () => void;
  setNeedsNamePrompt: (v: boolean) => void;
  loadFromStorage: () => void;
  clearCanvas: () => void;
  importFromJson: (file: File) => Promise<void>;
  /** Silently saves the current canvas as a room snapshot (no toast, no currentFile change). */
  saveRoomSnapshot: (roomId: string, name: string) => void;
}

// ── Startup: try legacy key, then last-saved file, otherwise empty canvas ────
const _legacy = loadFromLocalStorage();
let _initNodes: AppNode[]     = _legacy?.nodes ?? [];
let _initEdges: AppEdge[]     = _legacy?.edges ?? [];
let _initFileId: string | null   = null;
let _initFileName: string | null = null;

if (!_legacy) {
  const lastId = getLastFileId();
  if (lastId) {
    const file = getAllFiles().find((f) => f.id === lastId);
    if (file) {
      _initNodes    = file.nodes;
      _initEdges    = file.edges;
      _initFileId   = file.id;
      _initFileName = file.name;
    }
  }
}

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: _initNodes,
  edges: _initEdges,
  past: [],
  future: [],
  clipboard: null,
  showGrid: true,
  currentFileId: _initFileId,
  currentFileName: _initFileName,
  files: getAllFiles(),
  needsNamePrompt: false,
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toast: null,
  showToast: (msg) => {
    set({ toast: msg });
    setTimeout(() => set({ toast: null }), 2000);
  },

  saveSnapshot: () => {
    const { nodes, edges, past } = get();
    set({
      past: [...past.slice(-(MAX_HISTORY - 1)), { nodes, edges }],
      future: [],
    });
  },

  undo: () => {
    const { past, nodes, edges, future } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    set({
      past: past.slice(0, -1),
      nodes: prev.nodes,
      edges: prev.edges,
      future: [{ nodes, edges }, ...future.slice(0, MAX_HISTORY - 1)],
    });
  },

  redo: () => {
    const { past, nodes, edges, future } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      future: future.slice(1),
      nodes: next.nodes,
      edges: next.edges,
      past: [...past.slice(-(MAX_HISTORY - 1)), { nodes, edges }],
    });
  },

  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) }),

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),

  onConnect: (connection) => {
    get().saveSnapshot();
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
    });
  },

  // Remote updates from useCollabSync — intentionally bypass the undo stack.
  // Clearing `future` on every 33 ms remote broadcast would destroy the user's
  // in-progress redo history; remote state is authoritative but not user-initiated.
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (node) => {
    get().saveSnapshot();
    set({ nodes: [...get().nodes, node] });
  },

  updateNodeLabel: (id, label) => {
    get().saveSnapshot();
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, label } } : n
      ),
    });
  },

  updateNodeData: (id, patch) => {
    get().saveSnapshot();
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n
      ),
    });
  },

  updateEdgeData: (id, patch) => {
    get().saveSnapshot();
    set({
      edges: get().edges.map((e) =>
        e.id === id ? { ...e, data: { ...e.data, ...patch } } : e
      ),
    });
  },

  selectAll: () =>
    set({
      nodes: get().nodes.map((n) => ({ ...n, selected: true })),
      edges: get().edges.map((e) => ({ ...e, selected: true })),
    }),

  removeSelectedElements: () => {
    get().saveSnapshot();
    set({
      nodes: get().nodes.filter((n) => !n.selected),
      edges: get().edges.filter((e) => !e.selected),
    });
  },

  copySelected: () => {
    const { nodes, edges } = get();
    const selectedNodes = nodes.filter((n) => n.selected);
    if (selectedNodes.length === 0) return;
    const selectedIds = new Set(selectedNodes.map((n) => n.id));
    const selectedEdges = edges.filter(
      (e) => selectedIds.has(e.source) && selectedIds.has(e.target)
    );
    set({ clipboard: { nodes: selectedNodes, edges: selectedEdges } });
  },

  pasteClipboard: () => {
    const { clipboard, nodes, edges } = get();
    if (!clipboard || clipboard.nodes.length === 0) return;
    get().saveSnapshot();

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
      clipboard: { nodes: newNodes, edges: newEdges },
    });
  },

  saveToStorage: () => {
    const { currentFileId, currentFileName, saveFile } = get();
    if (currentFileId && currentFileName) {
      saveFile(currentFileName);
    } else {
      set({ needsNamePrompt: true });
    }
  },

  saveFile: (name: string) => {
    const { nodes, edges, currentFileId, showToast } = get();
    const id = currentFileId ?? createId('file');
    const file: SavedFile = { id, name, updatedAt: Date.now(), nodes, edges };
    upsertFile(file);
    setLastFileId(id);
    set({ currentFileId: id, currentFileName: name, files: getAllFiles(), needsNamePrompt: false });
    showToast(`Saved "${name}"`);
  },

  saveAsFile: (name: string) => {
    const { nodes, edges, showToast } = get();
    const id = createId('file');
    const file: SavedFile = { id, name, updatedAt: Date.now(), nodes, edges };
    upsertFile(file);
    setLastFileId(id);
    set({ currentFileId: id, currentFileName: name, files: getAllFiles(), needsNamePrompt: false });
    showToast(`Saved "${name}"`);
  },

  loadFile: (id: string) => {
    const file = getAllFiles().find((f) => f.id === id);
    if (!file) return;
    if (file.roomId) {
      // Navigate to the room URL — CollabLayer will load authoritative state from server.
      window.location.hash = `room/${file.roomId}`;
      return;
    }
    setLastFileId(id);
    set({
      nodes: file.nodes,
      edges: file.edges,
      past: [],
      future: [],
      currentFileId: file.id,
      currentFileName: file.name,
    });
  },

  deleteFile: (id: string) => {
    removeFile(id);
    const { currentFileId } = get();
    set({
      files: getAllFiles(),
      ...(currentFileId === id ? { currentFileId: null, currentFileName: null } : {}),
    });
  },

  newCanvas: () => {
    get().saveSnapshot();
    setLastFileId(null);
    set({ nodes: [], edges: [], currentFileId: null, currentFileName: null, past: [], future: [] });
  },

  setNeedsNamePrompt: (v: boolean) => set({ needsNamePrompt: v }),

  loadFromStorage: () => {},

  clearCanvas: () => {
    get().saveSnapshot();
    set({ nodes: [], edges: [] });
  },

  saveRoomSnapshot: (roomId: string, name: string) => {
    const { nodes, edges } = get();
    upsertFile({ id: `room-${roomId}`, name, updatedAt: Date.now(), nodes, edges, roomId });
    set({ files: getAllFiles() });
  },

  importFromJson: async (file: File) => {
    try {
      const text = await file.text();
      const raw = JSON.parse(text) as unknown;
      const result = parseExport(raw);
      if (!result) {
        get().showToast('Invalid or incompatible file');
        return;
      }
      get().saveSnapshot();
      set({
        nodes: result.nodes,
        edges: result.edges,
        past: [],
        future: [],
        currentFileId: null,
        currentFileName: result.name,
      });
      get().showToast(`Imported "${result.name}"`);
    } catch {
      get().showToast('Failed to read file');
    }
  },
}));
