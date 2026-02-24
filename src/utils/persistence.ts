import type { AppNode } from '../types/nodes';
import type { AppEdge } from '../types/edges';

const LEGACY_KEY = 'blueprint-canvas-v1';
const FILES_KEY  = 'blueprint-files-v1';

export interface SavedFile {
  id: string;
  name: string;
  updatedAt: number;
  nodes: AppNode[];
  edges: AppEdge[];
}

// ─── Legacy (startup only) ────────────────────────────────────────────────────

export function loadFromLocalStorage(): { nodes: AppNode[]; edges: AppEdge[] } | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { nodes: AppNode[]; edges: AppEdge[] };
  } catch {
    return null;
  }
}

// ─── Multi-file ────────────────────────────────────────────────────────────────

export function getAllFiles(): SavedFile[] {
  try {
    const raw = localStorage.getItem(FILES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedFile[];
  } catch {
    return [];
  }
}

export function upsertFile(file: SavedFile): void {
  try {
    const files = getAllFiles();
    const idx = files.findIndex((f) => f.id === file.id);
    if (idx >= 0) files[idx] = file;
    else files.unshift(file);
    localStorage.setItem(FILES_KEY, JSON.stringify(files));
  } catch (e) {
    console.error('Failed to save file:', e);
  }
}

export function removeFile(id: string): void {
  try {
    const files = getAllFiles().filter((f) => f.id !== id);
    localStorage.setItem(FILES_KEY, JSON.stringify(files));
  } catch (e) {
    console.error('Failed to delete file:', e);
  }
}
