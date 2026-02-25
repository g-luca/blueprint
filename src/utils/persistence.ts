import type { AppNode } from '../types/nodes';
import type { AppEdge } from '../types/edges';

const LEGACY_KEY = 'blueprint-canvas-v1';
const FILES_KEY  = 'blueprint-files-v1';

// ─── Export format & versioning ───────────────────────────────────────────────

/** Increment this when the exported schema changes. Add a matching entry to MIGRATIONS. */
export const SCHEMA_VERSION = 1;

export interface BlueprintExport {
  version: number;
  metadata: {
    name: string;
    createdAt: number;
  };
  nodes: AppNode[];
  edges: AppEdge[];
}

/**
 * Keyed by the version that needs upgrading.
 * e.g. MIGRATIONS[1] upgrades a v1 payload → v2.
 * Leave empty until a breaking schema change is made.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MIGRATIONS: Record<number, (data: any) => any> = {
  // future: 1: (data) => { ...transform... }
};

export function createExport(nodes: AppNode[], edges: AppEdge[], name: string): BlueprintExport {
  return {
    version: SCHEMA_VERSION,
    metadata: { name, createdAt: Date.now() },
    nodes,
    edges,
  };
}

export function parseExport(
  raw: unknown,
): { nodes: AppNode[]; edges: AppEdge[]; name: string } | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  // Gracefully handle a plain {nodes, edges} dump (no version field).
  if (!('version' in obj) && Array.isArray(obj.nodes) && Array.isArray(obj.edges)) {
    return { nodes: obj.nodes as AppNode[], edges: obj.edges as AppEdge[], name: 'Imported' };
  }

  if (typeof obj.version !== 'number') return null;
  if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) return null;

  // Run any applicable migrations from detected version up to SCHEMA_VERSION.
  let data = obj;
  for (let v = obj.version as number; v < SCHEMA_VERSION; v++) {
    const migrate = MIGRATIONS[v];
    if (migrate) data = migrate(data) as Record<string, unknown>;
  }

  const meta = data.metadata as Record<string, unknown> | undefined;
  const name = typeof meta?.name === 'string' ? meta.name : 'Imported';
  return { nodes: data.nodes as AppNode[], edges: data.edges as AppEdge[], name };
}

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
