import { describe, it, expect, beforeEach } from 'bun:test';
import {
  createExport,
  parseExport,
  getAllFiles,
  upsertFile,
  removeFile,
  SCHEMA_VERSION,
  type SavedFile,
} from '../../src/utils/persistence';

// Provide a minimal localStorage mock — bun test runs in Node, not the browser.
class MockLocalStorage {
  private data = new Map<string, string>();
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void { this.data.set(key, value); }
  removeItem(key: string): void { this.data.delete(key); }
  clear(): void { this.data.clear(); }
}
(globalThis as never as { localStorage: MockLocalStorage }).localStorage = new MockLocalStorage();

// ─── createExport ─────────────────────────────────────────────────────────────

describe('createExport', () => {
  it('includes the current schema version', () => {
    const result = createExport([], [], 'My Design');
    expect(result.version).toBe(SCHEMA_VERSION);
  });

  it('includes the supplied name and a numeric timestamp', () => {
    const before = Date.now();
    const result = createExport([], [], 'My Design');
    expect(result.metadata.name).toBe('My Design');
    expect(result.metadata.createdAt).toBeGreaterThanOrEqual(before);
  });

  it('passes nodes and edges through unchanged', () => {
    const nodes = [{ id: 'n1' } as never];
    const edges = [{ id: 'e1' } as never];
    const result = createExport(nodes, edges, 'Test');
    expect(result.nodes).toBe(nodes);
    expect(result.edges).toBe(edges);
  });
});

// ─── parseExport ──────────────────────────────────────────────────────────────

describe('parseExport', () => {
  it('returns null for null / non-object inputs', () => {
    expect(parseExport(null)).toBeNull();
    expect(parseExport(undefined)).toBeNull();
    expect(parseExport('string')).toBeNull();
    expect(parseExport(42)).toBeNull();
  });

  it('returns null when nodes or edges are missing', () => {
    expect(parseExport({ version: 1 })).toBeNull();
    expect(parseExport({ version: 1, nodes: [] })).toBeNull();
    expect(parseExport({ version: 1, edges: [] })).toBeNull();
  });

  it('returns null when version is not a number', () => {
    expect(parseExport({ version: '1', nodes: [], edges: [] })).toBeNull();
  });

  it('parses a valid versioned export', () => {
    const input = {
      version: 1,
      metadata: { name: 'Test Canvas', createdAt: 0 },
      nodes: [],
      edges: [],
    };
    const result = parseExport(input);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Test Canvas');
    expect(result!.nodes).toEqual([]);
    expect(result!.edges).toEqual([]);
  });

  it('accepts a legacy plain {nodes, edges} dump without a version field', () => {
    const input = { nodes: [{ id: 'a' }], edges: [] };
    const result = parseExport(input);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Imported');
    expect(result!.nodes).toHaveLength(1);
  });

  it('defaults name to Imported when metadata is absent', () => {
    const result = parseExport({ version: 1, nodes: [], edges: [] });
    expect(result!.name).toBe('Imported');
  });

  it('defaults name to Imported when metadata.name is not a string', () => {
    const result = parseExport({ version: 1, metadata: { name: 99 }, nodes: [], edges: [] });
    expect(result!.name).toBe('Imported');
  });
});

// ─── getAllFiles / upsertFile / removeFile ────────────────────────────────────

describe('getAllFiles / upsertFile / removeFile', () => {
  const file = (id: string, name: string): SavedFile => ({
    id,
    name,
    updatedAt: Date.now(),
    nodes: [],
    edges: [],
  });

  beforeEach(() => {
    (globalThis as never as { localStorage: MockLocalStorage }).localStorage.clear();
  });

  it('returns an empty array when nothing is stored', () => {
    expect(getAllFiles()).toEqual([]);
  });

  it('inserts a new file and retrieves it', () => {
    upsertFile(file('f1', 'Design 1'));
    const files = getAllFiles();
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('Design 1');
  });

  it('updates an existing file in-place without duplicating', () => {
    upsertFile(file('f1', 'Design 1'));
    upsertFile({ ...file('f1', 'Updated'), updatedAt: Date.now() + 1 });
    const files = getAllFiles();
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('Updated');
  });

  it('prepends new files so the most recently upserted is first', () => {
    upsertFile(file('f1', 'First'));
    upsertFile(file('f2', 'Second'));
    const files = getAllFiles();
    expect(files[0].name).toBe('Second');
    expect(files[1].name).toBe('First');
  });

  it('removes a file by id', () => {
    upsertFile(file('f1', 'To delete'));
    upsertFile(file('f2', 'Keep'));
    removeFile('f1');
    const files = getAllFiles();
    expect(files).toHaveLength(1);
    expect(files[0].id).toBe('f2');
  });

  it('removeFile is a no-op for an unknown id', () => {
    upsertFile(file('f1', 'Keep'));
    removeFile('unknown');
    expect(getAllFiles()).toHaveLength(1);
  });

  it('stores the roomId field when present', () => {
    upsertFile({ ...file('f1', 'Room'), roomId: 'room-abc' });
    expect(getAllFiles()[0].roomId).toBe('room-abc');
  });
});
