import { vi } from 'bun:test';

export class MockStorage {
  private data = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.data.get(key) as T | undefined;
  }

  async put(key: string, value: unknown): Promise<void> {
    this.data.set(key, value);
  }

  async delete(key: string): Promise<boolean> {
    const had = this.data.has(key);
    this.data.delete(key);
    return had;
  }

  async deleteAll(): Promise<void> {
    this.data.clear();
  }
}

export class FakeWebSocket {
  readyState = 1;
  send = vi.fn();
  close = vi.fn();
}

export class MockDOState {
  storage = new MockStorage();
  private sockets = new Map<FakeWebSocket, string[]>();

  blockConcurrencyWhile = async (fn: () => Promise<void>): Promise<void> => {
    await fn();
  };

  getWebSockets(): FakeWebSocket[] {
    return Array.from(this.sockets.keys());
  }

  getTags(ws: FakeWebSocket): string[] {
    return this.sockets.get(ws) ?? [];
  }

  acceptWebSocket(ws: FakeWebSocket, tags: string[]): void {
    this.sockets.set(ws, tags);
  }

  /** Simulate the CF runtime deregistering a socket when it closes. */
  removeWebSocket(ws: FakeWebSocket): void {
    this.sockets.delete(ws);
  }
}

/** Builds a Request with explicit Content-Length when a body is provided. */
export function makeRequest(method: string, path: string, body?: string): Request {
  if (body !== undefined) {
    return new Request(`http://localhost${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(new TextEncoder().encode(body).byteLength),
      },
      body,
    });
  }
  return new Request(`http://localhost${path}`, { method });
}
