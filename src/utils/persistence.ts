import type { AppNode } from '../types/nodes';
import type { AppEdge } from '../types/edges';

const STORAGE_KEY = 'blueprint-canvas-v1';

interface CanvasSnapshot {
  nodes: AppNode[];
  edges: AppEdge[];
}

export function saveToLocalStorage(nodes: AppNode[], edges: AppEdge[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
  } catch (e) {
    console.error('Failed to save canvas:', e);
  }
}

export function loadFromLocalStorage(): CanvasSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CanvasSnapshot;
  } catch (e) {
    console.error('Failed to load canvas:', e);
    return null;
  }
}
