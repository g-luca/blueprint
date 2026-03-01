import { describe, it, expect, beforeEach, vi } from 'bun:test';
import { BlueprintRoom } from '../../worker/room';
import { MockDOState, FakeWebSocket, makeRequest } from './helpers';

// ── WebSocketPair mock ────────────────────────────────────────────────────────
// Captures the server socket (index 1) so tests can inspect what the DO sends.

let lastServerSocket: FakeWebSocket | null = null;

class FakeWebSocketPair {
  [0]: FakeWebSocket;
  [1]: FakeWebSocket;
  constructor() {
    this[0] = new FakeWebSocket(); // client — returned in the 101 Response
    this[1] = new FakeWebSocket(); // server — passed to acceptWebSocket
    lastServerSocket = this[1];
  }
}
// @ts-expect-error – CF global not available in Node/bun
globalThis.WebSocketPair = FakeWebSocketPair;

// ── Test helpers ──────────────────────────────────────────────────────────────

const VALID_HASH = 'a'.repeat(64);

function wsUpgradeRequest(path = '/collab/abc', pwd?: string): Request {
  const url = `http://localhost${path}${pwd ? `?pwd=${pwd}` : ''}`;
  return new Request(url, { headers: { Upgrade: 'websocket' } });
}

interface Connected {
  serverWs: FakeWebSocket;
  welcome: {
    type: string;
    clientId: string;
    color: string;
    name: string;
    clients: { clientId: string; color: string; name: string }[];
    snapshot: { nodes: unknown[]; edges: unknown[] };
  };
}

/**
 * Performs a WS upgrade and returns the server-side socket + parsed welcome.
 * Clears the server socket's send history after extracting the welcome so tests
 * start with a clean call count.
 */
async function connect(room: BlueprintRoom, path = '/collab/abc', pwd?: string): Promise<Connected> {
  const resp = await room.fetch(wsUpgradeRequest(path, pwd));
  expect(resp.status).toBe(101);
  const serverWs = lastServerSocket!;
  lastServerSocket = null;
  const welcome = JSON.parse(serverWs.send.mock.calls[0][0] as string);
  serverWs.send.mockClear();
  return { serverWs, welcome };
}

/** Sends a JSON message as if coming from the given server-side socket. */
async function send(room: BlueprintRoom, ws: FakeWebSocket, msg: object): Promise<void> {
  await room.webSocketMessage(ws as never, JSON.stringify(msg));
}

/** Sends a raw string (for malformed JSON / size tests). */
async function sendRaw(room: BlueprintRoom, ws: FakeWebSocket, raw: string): Promise<void> {
  await room.webSocketMessage(ws as never, raw);
}

// ── Test setup ────────────────────────────────────────────────────────────────

let state: MockDOState;
let room: BlueprintRoom;

beforeEach(() => {
  vi.clearAllMocks();
  lastServerSocket = null;
  state = new MockDOState();
  room = new BlueprintRoom(state as never, {} as never);
});

// ── HTTP endpoint tests ───────────────────────────────────────────────────────

describe('OPTIONS', () => {
  it('returns 204 with CORS headers', async () => {
    const resp = await room.fetch(makeRequest('OPTIONS', '/collab/abc'));
    expect(resp.status).toBe(204);
    expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});

describe('GET /collab/:id/meta', () => {
  it('returns hasPassword:false for a fresh room', async () => {
    const resp = await room.fetch(makeRequest('GET', '/collab/abc/meta'));
    expect(resp.status).toBe(200);
    const body = await resp.json() as { hasPassword: boolean };
    expect(body.hasPassword).toBe(false);
  });

  it('returns hasPassword:true after /init sets a password', async () => {
    await room.fetch(makeRequest('POST', '/collab/abc/init', JSON.stringify({ passwordHash: VALID_HASH })));
    const resp = await room.fetch(makeRequest('GET', '/collab/abc/meta'));
    const body = await resp.json() as { hasPassword: boolean };
    expect(body.hasPassword).toBe(true);
  });

  it('includes CORS headers', async () => {
    const resp = await room.fetch(makeRequest('GET', '/collab/abc/meta'));
    expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});

describe('POST /collab/:id/init', () => {
  it('accepts a passwordless room (empty body)', async () => {
    const resp = await room.fetch(makeRequest('POST', '/collab/abc/init'));
    expect(resp.status).toBe(200);
  });

  it('accepts a valid 64-char hex passwordHash', async () => {
    const resp = await room.fetch(
      makeRequest('POST', '/collab/abc/init', JSON.stringify({ passwordHash: VALID_HASH })),
    );
    expect(resp.status).toBe(200);
  });

  it('rejects a non-hex passwordHash', async () => {
    const resp = await room.fetch(
      makeRequest('POST', '/collab/abc/init', JSON.stringify({ passwordHash: 'not-a-hex-string!' })),
    );
    expect(resp.status).toBe(400);
  });

  it('rejects a passwordHash shorter than 64 chars', async () => {
    const resp = await room.fetch(
      makeRequest('POST', '/collab/abc/init', JSON.stringify({ passwordHash: 'abc123' })),
    );
    expect(resp.status).toBe(400);
  });

  it('rejects a second /init when a password is already stored', async () => {
    await room.fetch(
      makeRequest('POST', '/collab/abc/init', JSON.stringify({ passwordHash: VALID_HASH })),
    );
    const resp = await room.fetch(
      makeRequest('POST', '/collab/abc/init', JSON.stringify({ passwordHash: VALID_HASH })),
    );
    expect(resp.status).toBe(409);
  });

  it('rejects a second /init even when the first was passwordless', async () => {
    // A second /init on a passwordless room could otherwise add a password,
    // locking the original creator out of their own room.
    await room.fetch(makeRequest('POST', '/collab/abc/init'));
    const resp = await room.fetch(
      makeRequest('POST', '/collab/abc/init', JSON.stringify({ passwordHash: VALID_HASH })),
    );
    expect(resp.status).toBe(409);
  });

  it('rejects /init when WebSocket sessions are already active', async () => {
    const ws = new FakeWebSocket();
    state.acceptWebSocket(ws, ['client1', '#fff', 'User']);
    const activeRoom = new BlueprintRoom(state as never, {} as never);
    const resp = await activeRoom.fetch(makeRequest('POST', '/collab/abc/init'));
    expect(resp.status).toBe(409);
  });

  it('returns 413 when the request body exceeds 1 KB', async () => {
    // Content-Length > MAX_INIT_BODY_BYTES (1024) is rejected before body parsing
    const body = JSON.stringify({ passwordHash: 'x'.repeat(1025) });
    const resp = await room.fetch(makeRequest('POST', '/collab/abc/init', body));
    expect(resp.status).toBe(413);
  });

  it('returns 400 for an invalid JSON body', async () => {
    const resp = await room.fetch(makeRequest('POST', '/collab/abc/init', 'not json'));
    expect(resp.status).toBe(400);
  });

  it('returns 400 for an uppercase hex passwordHash (regex requires lowercase [0-9a-f])', async () => {
    const resp = await room.fetch(
      makeRequest('POST', '/collab/abc/init', JSON.stringify({ passwordHash: 'A'.repeat(64) })),
    );
    expect(resp.status).toBe(400);
  });

  it('returns 400 when passwordHash is null', async () => {
    const resp = await room.fetch(
      makeRequest('POST', '/collab/abc/init', JSON.stringify({ passwordHash: null })),
    );
    expect(resp.status).toBe(400);
  });

  it('returns 400 when passwordHash is a number', async () => {
    const resp = await room.fetch(
      makeRequest('POST', '/collab/abc/init', JSON.stringify({ passwordHash: 12345 })),
    );
    expect(resp.status).toBe(400);
  });

  it('returns 200 for valid JSON with no passwordHash field (registers a passwordless room)', async () => {
    const resp = await room.fetch(
      makeRequest('POST', '/collab/abc/init', JSON.stringify({ unrelatedField: 'value' })),
    );
    expect(resp.status).toBe(200);
    const meta = await room.fetch(makeRequest('GET', '/collab/abc/meta'));
    const body = await meta.json() as { hasPassword: boolean };
    expect(body.hasPassword).toBe(false);
  });
});

describe('GET probe (password check)', () => {
  it('returns 200 for a passwordless room', async () => {
    const resp = await room.fetch(makeRequest('GET', '/collab/abc'));
    expect(resp.status).toBe(200);
  });

  it('returns 403 when the wrong password is supplied', async () => {
    await state.storage.put('passwordHash', VALID_HASH);
    const resp = await room.fetch(makeRequest('GET', '/collab/abc?pwd=wronghash'));
    expect(resp.status).toBe(403);
  });

  it('returns 403 when no password is supplied to a protected room', async () => {
    await state.storage.put('passwordHash', VALID_HASH);
    const resp = await room.fetch(makeRequest('GET', '/collab/abc'));
    expect(resp.status).toBe(403);
  });

  it('returns 200 when the correct password is supplied', async () => {
    await state.storage.put('passwordHash', VALID_HASH);
    const resp = await room.fetch(makeRequest('GET', `/collab/abc?pwd=${VALID_HASH}`));
    expect(resp.status).toBe(200);
  });

  it('does not leak canvas data in the 403 response body when unauthenticated', async () => {
    await state.storage.put('passwordHash', VALID_HASH);
    await state.storage.put('nodes', [{ id: 'secret-node', type: 'service' }]);
    await state.storage.put('edges', [{ id: 'secret-edge' }]);
    const resp = await room.fetch(makeRequest('GET', '/collab/abc'));
    expect(resp.status).toBe(403);
    const body = await resp.text();
    expect(body).not.toContain('secret-node');
    expect(body).not.toContain('secret-edge');
  });
});

describe('DELETE /collab/:id', () => {
  it('returns 204 for a passwordless room', async () => {
    const resp = await room.fetch(makeRequest('DELETE', '/collab/abc'));
    expect(resp.status).toBe(204);
  });

  it('clears the password after DELETE', async () => {
    await state.storage.put('passwordHash', VALID_HASH);
    await room.fetch(makeRequest('DELETE', `/collab/abc?pwd=${VALID_HASH}`));
    const meta = await room.fetch(makeRequest('GET', '/collab/abc/meta'));
    const body = await meta.json() as { hasPassword: boolean };
    expect(body.hasPassword).toBe(false);
  });

  it('returns 403 when the wrong password is supplied', async () => {
    await state.storage.put('passwordHash', VALID_HASH);
    const resp = await room.fetch(makeRequest('DELETE', '/collab/abc?pwd=badpwd'));
    expect(resp.status).toBe(403);
  });

  it('returns 204 with correct password', async () => {
    await state.storage.put('passwordHash', VALID_HASH);
    const resp = await room.fetch(makeRequest('DELETE', `/collab/abc?pwd=${VALID_HASH}`));
    expect(resp.status).toBe(204);
  });

  it('clears persisted nodes and edges so the next joiner sees an empty snapshot', async () => {
    const { serverWs: wsA } = await connect(room);
    await send(room, wsA, { type: 'state_update', senderId: 'x', nodes: [{ id: 'n1' }], edges: [] });
    await room.fetch(makeRequest('DELETE', '/collab/abc'));

    const { welcome } = await connect(room);
    expect(welcome.snapshot.nodes).toEqual([]);
    expect(welcome.snapshot.edges).toEqual([]);
  });
});

// ── WebSocket connection & welcome ────────────────────────────────────────────

describe('WebSocket connection', () => {
  it('upgrades to 101 and returns a well-formed welcome message', async () => {
    const { welcome } = await connect(room);
    expect(welcome.type).toBe('welcome');
    expect(typeof welcome.clientId).toBe('string');
    expect(welcome.clientId.length).toBeGreaterThan(0);
    expect(typeof welcome.color).toBe('string');
    expect(typeof welcome.name).toBe('string');
    expect(Array.isArray(welcome.clients)).toBe(true);
    expect(Array.isArray(welcome.snapshot.nodes)).toBe(true);
    expect(Array.isArray(welcome.snapshot.edges)).toBe(true);
  });

  it('first client receives empty clients array and empty snapshot', async () => {
    const { welcome } = await connect(room);
    expect(welcome.clients).toEqual([]);
    expect(welcome.snapshot.nodes).toEqual([]);
    expect(welcome.snapshot.edges).toEqual([]);
  });

  it('second client receives the first client in the clients array', async () => {
    const { welcome: wA } = await connect(room);
    const { welcome: wB } = await connect(room);

    expect(wB.clients).toHaveLength(1);
    expect(wB.clients[0].clientId).toBe(wA.clientId);
    expect(wB.clients[0].color).toBe(wA.color);
    expect(wB.clients[0].name).toBe(wA.name);
  });

  it('first client receives empty clients array even after second client joins', async () => {
    const { welcome: wA } = await connect(room);
    // wA was captured at connection time — clients was [] then
    expect(wA.clients).toEqual([]);
  });

  it('broadcasts client_joined to existing sockets when a new client connects', async () => {
    const { serverWs: wsA } = await connect(room);
    // wsA.send was cleared by connect(); any new calls are post-connection
    const { welcome: wB } = await connect(room);

    expect(wsA.send).toHaveBeenCalledTimes(1);
    const joined = JSON.parse(wsA.send.mock.calls[0][0] as string);
    expect(joined.type).toBe('client_joined');
    expect(joined.clientId).toBe(wB.clientId);
    expect(joined.color).toBe(wB.color);
    expect(joined.name).toBe(wB.name);
  });

  it('broadcasts client_joined to ALL existing sockets in a 3-client scenario', async () => {
    const { serverWs: wsA } = await connect(room);
    const { serverWs: wsB } = await connect(room);
    wsA.send.mockClear();
    wsB.send.mockClear();

    const { welcome: wC } = await connect(room);
    expect(wsA.send).toHaveBeenCalledTimes(1);
    expect(wsB.send).toHaveBeenCalledTimes(1);
    const msgA = JSON.parse(wsA.send.mock.calls[0][0] as string);
    const msgB = JSON.parse(wsB.send.mock.calls[0][0] as string);
    expect(msgA.clientId).toBe(wC.clientId);
    expect(msgB.clientId).toBe(wC.clientId);
  });

  it('assigns unique names to concurrent clients', async () => {
    const { welcome: wA } = await connect(room);
    const { welcome: wB } = await connect(room);
    expect(wA.name).not.toBe(wB.name);
  });

  it('second client receives the snapshot stored by a previous state_update', async () => {
    const { serverWs: wsA } = await connect(room);
    const nodes = [{ id: 'n1', type: 'service' }];
    const edges = [{ id: 'e1', source: 'n1', target: 'n2' }];
    await send(room, wsA, { type: 'state_update', senderId: 'x', nodes, edges });

    const { welcome: wB } = await connect(room);
    expect(wB.snapshot.nodes).toEqual(nodes);
    expect(wB.snapshot.edges).toEqual(edges);
  });

  it('returns 503 when the room is at capacity (20 connections)', async () => {
    for (let i = 0; i < 20; i++) await connect(room);
    const resp = await room.fetch(wsUpgradeRequest());
    expect(resp.status).toBe(503);
  });

  it('allows a new connection after one existing client disconnects', async () => {
    const connections: Connected[] = [];
    for (let i = 0; i < 20; i++) connections.push(await connect(room));
    // Simulate CF runtime deregistering the socket when it closes.
    const toClose = connections[0].serverWs;
    state.removeWebSocket(toClose);
    await room.webSocketClose(toClose as never);
    // Room now has 19 active sockets — the next upgrade must succeed.
    const resp = await room.fetch(wsUpgradeRequest());
    expect(resp.status).toBe(101);
  });

  it('9th client gets the same color as the 1st (colors cycle modulo 8)', async () => {
    const { welcome: first } = await connect(room);
    for (let i = 1; i < 8; i++) await connect(room);
    const { welcome: ninth } = await connect(room);
    expect(ninth.color).toBe(first.color);
  });

  it('returns 403 for a password-protected room with no pwd param', async () => {
    await state.storage.put('passwordHash', VALID_HASH);
    const resp = await room.fetch(wsUpgradeRequest());
    expect(resp.status).toBe(403);
  });

  it('returns 403 for a password-protected room with the wrong pwd', async () => {
    await state.storage.put('passwordHash', VALID_HASH);
    const resp = await room.fetch(wsUpgradeRequest('/collab/abc', 'wronghash'));
    expect(resp.status).toBe(403);
  });

  it('does not leak canvas data in the 403 response body on failed WS upgrade', async () => {
    await state.storage.put('passwordHash', VALID_HASH);
    await state.storage.put('nodes', [{ id: 'secret-node', type: 'service' }]);
    await state.storage.put('edges', [{ id: 'secret-edge' }]);
    const resp = await room.fetch(wsUpgradeRequest('/collab/abc', 'wrongpwd'));
    expect(resp.status).toBe(403);
    const body = await resp.text();
    expect(body).not.toContain('secret-node');
    expect(body).not.toContain('secret-edge');
  });

  it('upgrades successfully with the correct password', async () => {
    await state.storage.put('passwordHash', VALID_HASH);
    const { welcome } = await connect(room, '/collab/abc', VALID_HASH);
    expect(welcome.type).toBe('welcome');
  });
});

// ── state_update ──────────────────────────────────────────────────────────────

describe('state_update', () => {
  it('relays nodes and edges to other connected clients', async () => {
    const { serverWs: wsA } = await connect(room);
    const { serverWs: wsB } = await connect(room);
    wsA.send.mockClear();
    wsB.send.mockClear();

    const nodes = [{ id: 'n1', type: 'service' }];
    const edges = [{ id: 'e1' }];
    await send(room, wsA, { type: 'state_update', senderId: 'x', nodes, edges });

    expect(wsB.send).toHaveBeenCalledTimes(1);
    const relayed = JSON.parse(wsB.send.mock.calls[0][0] as string);
    expect(relayed.type).toBe('state_update');
    expect(relayed.nodes).toEqual(nodes);
    expect(relayed.edges).toEqual(edges);
  });

  it('does NOT echo state_update back to the sender', async () => {
    const { serverWs: wsA } = await connect(room);
    wsA.send.mockClear();
    await send(room, wsA, { type: 'state_update', senderId: 'x', nodes: [], edges: [] });
    expect(wsA.send).not.toHaveBeenCalled();
  });

  it('sets senderId to the sender\'s server-assigned clientId (not the claimed one)', async () => {
    const { serverWs: wsA, welcome: wA } = await connect(room);
    const { serverWs: wsB } = await connect(room);
    wsA.send.mockClear();
    wsB.send.mockClear();

    await send(room, wsA, { type: 'state_update', senderId: 'spoofed-id', nodes: [], edges: [] });
    const relayed = JSON.parse(wsB.send.mock.calls[0][0] as string);
    // The worker reads the clientId from the DO tags, not from the message body.
    expect(relayed.senderId).toBe(wA.clientId);
  });

  it('relays state_update to all other clients in a 3-client scenario', async () => {
    const { serverWs: wsA } = await connect(room);
    const { serverWs: wsB } = await connect(room);
    const { serverWs: wsC } = await connect(room);
    wsA.send.mockClear();
    wsB.send.mockClear();
    wsC.send.mockClear();

    await send(room, wsA, { type: 'state_update', senderId: 'x', nodes: [{ id: 'x' }], edges: [] });
    expect(wsA.send).not.toHaveBeenCalled();
    expect(wsB.send).toHaveBeenCalledTimes(1);
    expect(wsC.send).toHaveBeenCalledTimes(1);
  });

  it('persists nodes and edges to storage', async () => {
    const { serverWs: wsA } = await connect(room);
    const nodes = [{ id: 'n1' }];
    const edges = [{ id: 'e1' }];
    await send(room, wsA, { type: 'state_update', senderId: 'x', nodes, edges });
    expect(await state.storage.get('nodes')).toEqual(nodes);
    expect(await state.storage.get('edges')).toEqual(edges);
  });

  it('overwrites the previous state with each successive update', async () => {
    const { serverWs: wsA } = await connect(room);
    await send(room, wsA, { type: 'state_update', senderId: 'x', nodes: [{ id: 'old' }], edges: [] });
    const newNodes = [{ id: 'new' }];
    await send(room, wsA, { type: 'state_update', senderId: 'x', nodes: newNodes, edges: [] });
    expect(await state.storage.get('nodes')).toEqual(newNodes);
  });

  it('new joiner receives the latest persisted snapshot', async () => {
    const { serverWs: wsA } = await connect(room);
    const nodes = [{ id: 'n1' }, { id: 'n2' }];
    const edges = [{ id: 'e1' }];
    await send(room, wsA, { type: 'state_update', senderId: 'x', nodes, edges });

    const { welcome: wB } = await connect(room);
    expect(wB.snapshot.nodes).toEqual(nodes);
    expect(wB.snapshot.edges).toEqual(edges);
  });

  it('ignores state_update with non-array nodes (no relay, no persist)', async () => {
    const { serverWs: wsA } = await connect(room);
    const { serverWs: wsB } = await connect(room);
    wsA.send.mockClear();
    wsB.send.mockClear();

    await send(room, wsA, { type: 'state_update', senderId: 'x', nodes: 'bad', edges: [] });
    expect(wsB.send).not.toHaveBeenCalled();
    expect(await state.storage.get('nodes')).toBeUndefined();
  });

  it('ignores state_update with non-array edges (no relay, no persist)', async () => {
    const { serverWs: wsA } = await connect(room);
    const { serverWs: wsB } = await connect(room);
    wsA.send.mockClear();
    wsB.send.mockClear();

    await send(room, wsA, { type: 'state_update', senderId: 'x', nodes: [], edges: 'bad' });
    expect(wsB.send).not.toHaveBeenCalled();
    expect(await state.storage.get('edges')).toBeUndefined();
  });
});

// ── presence ──────────────────────────────────────────────────────────────────

describe('presence', () => {
  it('relays cursor position to other clients with senderId, color, and name', async () => {
    const { serverWs: wsA, welcome: wA } = await connect(room);
    const { serverWs: wsB } = await connect(room);
    wsA.send.mockClear();
    wsB.send.mockClear();

    await send(room, wsA, { type: 'presence', senderId: 'x', cursor: { x: 10, y: 20 } });
    expect(wsB.send).toHaveBeenCalledTimes(1);
    const relayed = JSON.parse(wsB.send.mock.calls[0][0] as string);
    expect(relayed.type).toBe('presence');
    expect(relayed.senderId).toBe(wA.clientId);
    expect(relayed.cursor).toEqual({ x: 10, y: 20 });
    expect(relayed.color).toBe(wA.color);
    expect(relayed.name).toBe(wA.name);
  });

  it('does NOT echo presence back to the sender', async () => {
    const { serverWs: wsA } = await connect(room);
    wsA.send.mockClear();
    await send(room, wsA, { type: 'presence', senderId: 'x', cursor: { x: 5, y: 5 } });
    expect(wsA.send).not.toHaveBeenCalled();
  });

  it('relays null cursor (client left the viewport)', async () => {
    const { serverWs: wsA } = await connect(room);
    const { serverWs: wsB } = await connect(room);
    wsA.send.mockClear();
    wsB.send.mockClear();

    await send(room, wsA, { type: 'presence', senderId: 'x', cursor: null });
    expect(wsB.send).toHaveBeenCalledTimes(1);
    const relayed = JSON.parse(wsB.send.mock.calls[0][0] as string);
    expect(relayed.cursor).toBeNull();
  });

  it('ignores presence with NaN cursor coordinates', async () => {
    const { serverWs: wsA } = await connect(room);
    const { serverWs: wsB } = await connect(room);
    wsA.send.mockClear();
    wsB.send.mockClear();

    await send(room, wsA, { type: 'presence', senderId: 'x', cursor: { x: NaN, y: 20 } });
    expect(wsB.send).not.toHaveBeenCalled();
  });

  it('ignores presence with Infinity cursor coordinates', async () => {
    const { serverWs: wsA } = await connect(room);
    const { serverWs: wsB } = await connect(room);
    wsA.send.mockClear();
    wsB.send.mockClear();

    await send(room, wsA, { type: 'presence', senderId: 'x', cursor: { x: Infinity, y: 20 } });
    expect(wsB.send).not.toHaveBeenCalled();
  });

  it('ignores presence with a string cursor', async () => {
    const { serverWs: wsA } = await connect(room);
    const { serverWs: wsB } = await connect(room);
    wsA.send.mockClear();
    wsB.send.mockClear();

    await send(room, wsA, { type: 'presence', senderId: 'x', cursor: 'not-a-point' });
    expect(wsB.send).not.toHaveBeenCalled();
  });

  it('ignores presence with an array cursor', async () => {
    const { serverWs: wsA } = await connect(room);
    const { serverWs: wsB } = await connect(room);
    wsA.send.mockClear();
    wsB.send.mockClear();

    await send(room, wsA, { type: 'presence', senderId: 'x', cursor: [10, 20] });
    expect(wsB.send).not.toHaveBeenCalled();
  });

  it('uses the server-assigned clientId as senderId, ignoring any spoofed value in the message body', async () => {
    const { serverWs: wsA, welcome: wA } = await connect(room);
    const { serverWs: wsB } = await connect(room);
    wsA.send.mockClear();
    wsB.send.mockClear();

    await send(room, wsA, { type: 'presence', senderId: 'spoofed-id', cursor: { x: 1, y: 2 } });
    const relayed = JSON.parse(wsB.send.mock.calls[0][0] as string);
    expect(relayed.senderId).toBe(wA.clientId);
  });

  it('relays presence to all other clients in a 3-client scenario', async () => {
    const { serverWs: wsA } = await connect(room);
    const { serverWs: wsB } = await connect(room);
    const { serverWs: wsC } = await connect(room);
    wsA.send.mockClear();
    wsB.send.mockClear();
    wsC.send.mockClear();

    await send(room, wsA, { type: 'presence', senderId: 'x', cursor: { x: 5, y: 10 } });
    expect(wsA.send).not.toHaveBeenCalled();
    expect(wsB.send).toHaveBeenCalledTimes(1);
    expect(wsC.send).toHaveBeenCalledTimes(1);
  });
});

// ── client_left ───────────────────────────────────────────────────────────────

describe('client_left', () => {
  it('broadcasts client_left with the correct clientId on webSocketClose', async () => {
    const { serverWs: wsA, welcome: wA } = await connect(room);
    const { serverWs: wsB } = await connect(room);
    wsA.send.mockClear();
    wsB.send.mockClear();

    await room.webSocketClose(wsA as never);
    expect(wsB.send).toHaveBeenCalledTimes(1);
    const msg = JSON.parse(wsB.send.mock.calls[0][0] as string);
    expect(msg.type).toBe('client_left');
    expect(msg.clientId).toBe(wA.clientId);
  });

  it('does not send client_left back to the disconnecting socket', async () => {
    const { serverWs: wsA } = await connect(room);
    wsA.send.mockClear();
    await room.webSocketClose(wsA as never);
    expect(wsA.send).not.toHaveBeenCalled();
  });

  it('does not crash when the last client disconnects', async () => {
    const { serverWs: wsA } = await connect(room);
    await expect(room.webSocketClose(wsA as never)).resolves.toBeUndefined();
  });

  it('broadcasts client_left to all remaining clients in a 3-client scenario', async () => {
    const { serverWs: wsA, welcome: wA } = await connect(room);
    const { serverWs: wsB } = await connect(room);
    const { serverWs: wsC } = await connect(room);
    wsA.send.mockClear();
    wsB.send.mockClear();
    wsC.send.mockClear();

    await room.webSocketClose(wsA as never);
    expect(wsB.send).toHaveBeenCalledTimes(1);
    expect(wsC.send).toHaveBeenCalledTimes(1);
    const msgB = JSON.parse(wsB.send.mock.calls[0][0] as string);
    expect(msgB.type).toBe('client_left');
    expect(msgB.clientId).toBe(wA.clientId);
  });

  it('also broadcasts client_left on webSocketError', async () => {
    const { serverWs: wsA, welcome: wA } = await connect(room);
    const { serverWs: wsB } = await connect(room);
    wsA.send.mockClear();
    wsB.send.mockClear();

    await room.webSocketError(wsA as never);
    expect(wsB.send).toHaveBeenCalledTimes(1);
    const msg = JSON.parse(wsB.send.mock.calls[0][0] as string);
    expect(msg.type).toBe('client_left');
    expect(msg.clientId).toBe(wA.clientId);
  });

  it('does not crash or broadcast when the closing socket has no server-side tags', async () => {
    const { serverWs: wsA } = await connect(room);
    wsA.send.mockClear();

    // A socket that was never registered via acceptWebSocket has no tags
    const unregistered = new FakeWebSocket();
    await expect(room.webSocketClose(unregistered as never)).resolves.toBeUndefined();
    expect(wsA.send).not.toHaveBeenCalled();
  });
});

// ── Message size limit ────────────────────────────────────────────────────────

describe('message size limit', () => {
  it('closes the socket with 1009 when a string message exceeds 512 KB', async () => {
    const { serverWs: wsA } = await connect(room);
    const huge = 'x'.repeat(512 * 1024 + 1);
    await sendRaw(room, wsA, huge);
    expect(wsA.close).toHaveBeenCalledWith(1009, 'Message too large');
  });

  it('closes the socket with 1009 when an ArrayBuffer message exceeds 512 KB', async () => {
    const { serverWs: wsA } = await connect(room);
    const ab = new ArrayBuffer(512 * 1024 + 1);
    await room.webSocketMessage(wsA as never, ab);
    expect(wsA.close).toHaveBeenCalledWith(1009, 'Message too large');
  });

  it('does not close the socket for a normal-sized message', async () => {
    const { serverWs: wsA } = await connect(room);
    await send(room, wsA, { type: 'state_update', senderId: 'x', nodes: [], edges: [] });
    expect(wsA.close).not.toHaveBeenCalled();
  });
});

// ── Encrypted state_update ────────────────────────────────────────────────────

describe('encrypted state_update', () => {
  it('relays { iv, ciphertext } to other clients unchanged', async () => {
    const { serverWs: wsA } = await connect(room);
    const { serverWs: wsB } = await connect(room);
    wsA.send.mockClear();
    wsB.send.mockClear();

    const payload = { type: 'state_update', senderId: 'x', iv: 'aGVsbG8=', ciphertext: 'd29ybGQ=' };
    await send(room, wsA, payload);

    expect(wsB.send).toHaveBeenCalledTimes(1);
    const relayed = JSON.parse(wsB.send.mock.calls[0][0] as string);
    expect(relayed.type).toBe('state_update');
    expect(relayed.iv).toBe('aGVsbG8=');
    expect(relayed.ciphertext).toBe('d29ybGQ=');
  });

  it('does NOT echo encrypted state_update back to the sender', async () => {
    const { serverWs: wsA } = await connect(room);
    wsA.send.mockClear();
    await send(room, wsA, { type: 'state_update', senderId: 'x', iv: 'aXY=', ciphertext: 'Y2lwaGVy' });
    expect(wsA.send).not.toHaveBeenCalled();
  });

  it('uses server-assigned clientId as senderId when relaying encrypted update', async () => {
    const { serverWs: wsA, welcome: wA } = await connect(room);
    const { serverWs: wsB } = await connect(room);
    wsA.send.mockClear();
    wsB.send.mockClear();

    await send(room, wsA, { type: 'state_update', senderId: 'spoofed', iv: 'aXY=', ciphertext: 'Y2lwaGVy' });
    const relayed = JSON.parse(wsB.send.mock.calls[0][0] as string);
    expect(relayed.senderId).toBe(wA.clientId);
  });

  it('persists the encrypted snapshot so a new joiner receives it in the welcome', async () => {
    const { serverWs: wsA } = await connect(room);
    const iv = 'aGVsbG8=';
    const ciphertext = 'd29ybGQ=';
    await send(room, wsA, { type: 'state_update', senderId: 'x', iv, ciphertext });

    const { welcome: wB } = await connect(room);
    const snap = wB.snapshot as { iv: string; ciphertext: string };
    expect(snap.iv).toBe(iv);
    expect(snap.ciphertext).toBe(ciphertext);
  });

  it('stores encryptedSnapshot in DO storage', async () => {
    const { serverWs: wsA } = await connect(room);
    await send(room, wsA, { type: 'state_update', senderId: 'x', iv: 'aXY=', ciphertext: 'Y2lwaGVy' });
    const stored = await state.storage.get('encryptedSnapshot') as { iv: string; ciphertext: string } | undefined;
    expect(stored?.iv).toBe('aXY=');
    expect(stored?.ciphertext).toBe('Y2lwaGVy');
  });

  it('a subsequent plain state_update does NOT replace the encrypted snapshot in the welcome', async () => {
    // Send encrypted first, then plain — the encrypted snapshot stays in encryptedSnapshot.
    // (Plain updates only update this.nodes / this.edges; they don't clear encryptedSnapshot.)
    const { serverWs: wsA } = await connect(room);
    const iv = 'aGVsbG8=';
    const ciphertext = 'd29ybGQ=';
    await send(room, wsA, { type: 'state_update', senderId: 'x', iv, ciphertext });
    await send(room, wsA, { type: 'state_update', senderId: 'x', nodes: [{ id: 'n1' }], edges: [] });

    const { welcome: wB } = await connect(room);
    // encryptedSnapshot takes priority in the welcome message
    const snap = wB.snapshot as { iv: string; ciphertext: string };
    expect(snap.iv).toBe(iv);
    expect(snap.ciphertext).toBe(ciphertext);
  });

  it('DELETE clears the encrypted snapshot so the next joiner sees an empty plain snapshot', async () => {
    const { serverWs: wsA } = await connect(room);
    await send(room, wsA, { type: 'state_update', senderId: 'x', iv: 'aXY=', ciphertext: 'Y2lwaGVy' });
    await room.fetch(makeRequest('DELETE', '/collab/abc'));

    const { welcome } = await connect(room);
    // After delete, encryptedSnapshot is null → plain empty snapshot
    expect((welcome.snapshot as { nodes: unknown[] }).nodes).toEqual([]);
    expect((welcome.snapshot as { edges: unknown[] }).edges).toEqual([]);
  });

  it('ignores encrypted state_update with non-string iv', async () => {
    const { serverWs: wsA } = await connect(room);
    const { serverWs: wsB } = await connect(room);
    wsA.send.mockClear();
    wsB.send.mockClear();

    // iv is not a string — should fall through to the plain-array check and fail there too
    await send(room, wsA, { type: 'state_update', senderId: 'x', iv: 123, ciphertext: 'Y2lwaGVy' });
    // Not relayed (iv check fails, nodes check fails too)
    expect(wsB.send).not.toHaveBeenCalled();
  });
});

// ── Malformed messages ────────────────────────────────────────────────────────

describe('malformed messages', () => {
  it('silently ignores non-JSON strings (no relay, no crash)', async () => {
    const { serverWs: wsA } = await connect(room);
    const { serverWs: wsB } = await connect(room);
    wsA.send.mockClear();
    wsB.send.mockClear();

    await expect(sendRaw(room, wsA, 'not json {{')).resolves.toBeUndefined();
    expect(wsB.send).not.toHaveBeenCalled();
    expect(wsA.close).not.toHaveBeenCalled();
  });

  it('silently ignores an empty string', async () => {
    const { serverWs: wsA } = await connect(room);
    wsA.send.mockClear();
    await expect(sendRaw(room, wsA, '')).resolves.toBeUndefined();
    expect(wsA.close).not.toHaveBeenCalled();
  });

  it('silently ignores unknown message types', async () => {
    const { serverWs: wsA } = await connect(room);
    const { serverWs: wsB } = await connect(room);
    wsA.send.mockClear();
    wsB.send.mockClear();

    await send(room, wsA, { type: 'unknown_type', data: 'something' });
    expect(wsB.send).not.toHaveBeenCalled();
    expect(wsA.close).not.toHaveBeenCalled();
  });
});
