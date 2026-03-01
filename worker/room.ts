import { nanoid } from 'nanoid';
import type { CollabMessage } from './types';

interface Env {}

const COLORS = [
  '#60a5fa', '#f472b6', '#34d399', '#fb923c',
  '#a78bfa', '#fbbf24', '#f87171', '#4ade80',
];

const ADJECTIVES = [
  'Dizzy', 'Sneaky', 'Grumpy', 'Fluffy', 'Sleepy', 'Bouncy', 'Wobbly', 'Confused',
  'Tiny', 'Fancy', 'Brave', 'Clumsy', 'Hungry', 'Silly', 'Chubby', 'Wiggly',
  'Lazy', 'Speedy', 'Dancing', 'Jumpy', 'Sparkly', 'Mighty', 'Gentle', 'Cosmic',
  'Sassy', 'Dapper', 'Zany', 'Jolly', 'Crafty', 'Witty', 'Peppy', 'Quirky',
  'Rowdy', 'Timid', 'Wacky', 'Zippy', 'Chill', 'Snappy', 'Loopy', 'Spunky',
];

const ANIMALS = [
  'Capybara', 'Narwhal', 'Platypus', 'Axolotl', 'Quokka', 'Pangolin', 'Manatee',
  'Wombat', 'Hippo', 'Tapir', 'Mudskipper', 'Binturong', 'Numbat', 'Aye-aye',
  'Blobfish', 'Dugong', 'Tardigrade', 'Quoll', 'Fossa', 'Pufferfish',
  'Salamander', 'Ocelot', 'Fennec', 'Lemur', 'Okapi', 'Tenrec', 'Kinkajou',
  'Shoebill', 'Meerkat', 'Dik-dik', 'Quetzal', 'Serval', 'Cassowary',
  'Gharial', 'Saiga', 'Frogfish', 'Nudibranch', 'Yak', 'Capuchin', 'Olm',
];

function randomName(usedNames: Set<string>): string {
  for (let i = 0; i < 20; i++) {
    const adj    = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const name = `${adj} ${animal}`;
    if (!usedNames.has(name)) return name;
  }
  // Exhausted unique attempts — append a suffix to guarantee uniqueness.
  const adj    = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj} ${animal} ${Math.floor(Math.random() * 100) + 2}`;
}

/** Maximum concurrent WebSocket connections per room. */
const MAX_CONNECTIONS = 20;
/** Maximum WebSocket message payload (512 KB). Larger messages are rejected. */
const MAX_MSG_BYTES = 512 * 1024;
/** Maximum body size for /init POST (1 KB is plenty for a 64-char hash). */
const MAX_INIT_BODY_BYTES = 1024;
/**
 * How long (ms) an empty room is kept alive before its storage is wiped.
 * Applies after the last user disconnects, or if a password-protected room
 * is initialised but nobody ever connects.  24 hours is generous enough for
 * a creator who sets a password and then shares the link before opening it.
 */
const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

function corsHeaders(allowOrigins = true): HeadersInit {
  return {
    ...(allowOrigins ? { 'Access-Control-Allow-Origin': '*' } : {}),
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

/** Returns true if the value is a valid {x,y} cursor position. */
function isValidCursor(v: unknown): v is { x: number; y: number } {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const obj = v as Record<string, unknown>;
  return typeof obj.x === 'number' && isFinite(obj.x)
      && typeof obj.y === 'number' && isFinite(obj.y);
}

export class BlueprintRoom {
  private nodes: Record<string, unknown>[] = [];
  private edges: Record<string, unknown>[] = [];

  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env,
  ) {
    // Restore persisted state on every (re)construction, including after hibernation.
    // Errors are caught so a storage failure doesn't stall every incoming request.
    this.ctx.blockConcurrencyWhile(async () => {
      try {
        this.nodes = (await this.ctx.storage.get<Record<string, unknown>[]>('nodes')) ?? [];
        this.edges = (await this.ctx.storage.get<Record<string, unknown>[]>('edges')) ?? [];
        // Defensive: storage corruption shouldn't break the DO
        if (!Array.isArray(this.nodes)) this.nodes = [];
        if (!Array.isArray(this.edges)) this.edges = [];
      } catch {
        this.nodes = [];
        this.edges = [];
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);

    // Determine whether this is a sub-route (/meta or /init) by checking
    // that there are at least 3 non-empty path segments (collab / roomId / sub).
    // This prevents a room whose ID equals "meta" or "init" from being misrouted.
    const segments = url.pathname.split('/').filter(Boolean);
    const isSubRoute = segments.length >= 3;
    const subRoute = isSubRoute ? segments[segments.length - 1] : '';

    // ── GET /collab/<roomId>/meta ───────────────────────────────────────────
    if (isSubRoute && subRoute === 'meta' && request.method === 'GET') {
      const hasPassword = !!(await this.ctx.storage.get<string>('passwordHash'));
      return Response.json({ hasPassword }, { headers: corsHeaders() });
    }

    // ── POST /collab/<roomId>/init ──────────────────────────────────────────
    // Sets the room password exactly once, but only if no WebSocket sessions
    // are already established.  This prevents an attacker from locking out
    // legitimate users in an active room, because by the time the room URL is
    // widely shared the creator's WebSocket is already connected.
    if (isSubRoute && subRoute === 'init' && request.method === 'POST') {
      // Block /init once anyone has connected — the room is "live".
      const activeSessions = this.ctx.getWebSockets().length;
      if (activeSessions > 0) {
        return new Response('Room already has active sessions', { status: 409 });
      }

      const existing = await this.ctx.storage.get<string>('passwordHash');
      if (existing) {
        return new Response('Room already has a password', { status: 409 });
      }

      // Guard against huge bodies before parsing JSON.
      const contentLength = parseInt(request.headers.get('Content-Length') ?? '0', 10);
      if (contentLength > MAX_INIT_BODY_BYTES) {
        return new Response('Request body too large', { status: 413 });
      }

      // Parse body only when there is one. An empty POST registers a
      // no-password room (exists solely to pass through the rate limiter).
      let body: { passwordHash?: unknown } = {};
      if (Number.isFinite(contentLength) && contentLength > 0) {
        try {
          body = await request.json() as { passwordHash?: unknown };
        } catch {
          return new Response('Invalid JSON', { status: 400 });
        }
      }

      if (body.passwordHash !== undefined) {
        if (typeof body.passwordHash !== 'string' ||
            body.passwordHash.length !== 64 ||
            !/^[0-9a-f]{64}$/.test(body.passwordHash)) {
          return new Response('passwordHash must be a 64-char lowercase hex string', { status: 400 });
        }
        await this.ctx.storage.put('passwordHash', body.passwordHash);
      }

      // Schedule cleanup in case the creator never opens the WebSocket.
      await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL_MS);
      return new Response('OK');
    }

    // ── Password check (probe GETs and WS upgrades) ─────────────────────────
    const storedHash = await this.ctx.storage.get<string>('passwordHash');
    if (storedHash) {
      const provided = url.searchParams.get('pwd');
      if (!provided || provided !== storedHash) {
        return new Response('Unauthorized', { status: 403, headers: corsHeaders() });
      }
    }

    // ── Non-WebSocket probe ─────────────────────────────────────────────────
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('OK', { headers: corsHeaders() });
    }

    // ── WebSocket upgrade ───────────────────────────────────────────────────
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

    // Cancel any pending cleanup alarm — the room is now live.
    await this.ctx.storage.deleteAlarm();

    const clientId = nanoid(8);
    // getWebSockets() BEFORE acceptWebSocket: count is the number of *other* active connections.
    // The DO serialises fetch() handlers, so this count is stable for the duration of this call.
    const existingSockets = this.ctx.getWebSockets();
    const existingCount = existingSockets.length;

    if (existingCount >= MAX_CONNECTIONS) {
      return new Response('Room is full', { status: 503 });
    }

    const isCreator = existingCount === 0;
    const color = COLORS[existingCount % COLORS.length];

    // Collect names already in use so we don't assign duplicates.
    const usedNames = new Set(
      existingSockets.flatMap((ws) => {
        const tags = this.ctx.getTags(ws);
        return tags[2] ? [tags[2]] : [];
      }),
    );
    const name = randomName(usedNames);

    this.ctx.acceptWebSocket(server, [clientId, color, name]);

    const welcome: CollabMessage = {
      type: 'welcome',
      clientId,
      color,
      name,
      isCreator,
      snapshot: { nodes: this.nodes, edges: this.edges },
    };
    server.send(JSON.stringify(welcome));

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    // Enforce size limit before any parsing.
    // For strings, encode to UTF-8 to get the true byte count — JS .length
    // counts UTF-16 code units which can undercount multi-byte characters.
    const byteLength = typeof message === 'string'
      ? new TextEncoder().encode(message).length
      : (message as ArrayBuffer).byteLength;
    if (byteLength > MAX_MSG_BYTES) {
      ws.close(1009, 'Message too large');
      return;
    }

    const text = typeof message === 'string' ? message : new TextDecoder().decode(message);
    let msg: CollabMessage;
    try {
      msg = JSON.parse(text) as CollabMessage;
    } catch {
      return; // ignore malformed JSON
    }

    const tags = this.ctx.getTags(ws);
    const clientId = tags[0] ?? 'unknown';
    const color    = tags[1] ?? '#ffffff';
    const name     = tags[2] ?? 'User';

    if (msg.type === 'state_update') {
      // Reject non-array payloads — storing them would corrupt every future joiner's snapshot.
      if (!Array.isArray(msg.nodes) || !Array.isArray(msg.edges)) return;

      this.nodes = msg.nodes;
      this.edges = msg.edges;
      // Fire-and-forget persist — don't block relay on the storage write.
      void Promise.all([
        this.ctx.storage.put('nodes', this.nodes).catch((e) => console.error('persist nodes:', e)),
        this.ctx.storage.put('edges', this.edges).catch((e) => console.error('persist edges:', e)),
      ]);
      const relay: CollabMessage = {
        type: 'state_update',
        senderId: clientId,
        nodes: msg.nodes,
        edges: msg.edges,
      };
      const payload = JSON.stringify(relay);
      for (const otherWs of this.ctx.getWebSockets()) {
        if (otherWs !== ws) {
          try { otherWs.send(payload); } catch { /* closed */ }
        }
      }
    } else if (msg.type === 'presence') {
      // Validate cursor before relaying: must be null or a finite {x,y} pair.
      // Rejecting malformed cursors prevents NaN layout artifacts in OtherCursors.tsx.
      const rawCursor = msg.cursor as unknown;
      if (rawCursor !== null && !isValidCursor(rawCursor)) return;

      const relay: CollabMessage = {
        type: 'presence',
        senderId: clientId,
        cursor: rawCursor === null ? null : (rawCursor as { x: number; y: number }),
        color,
        name,
      };
      const payload = JSON.stringify(relay);
      for (const otherWs of this.ctx.getWebSockets()) {
        if (otherWs !== ws) {
          try { otherWs.send(payload); } catch { /* closed */ }
        }
      }
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const tags = this.ctx.getTags(ws);
    const clientId = tags[0];
    if (!clientId) return;
    const msg: CollabMessage = { type: 'client_left', clientId };
    const payload = JSON.stringify(msg);
    for (const otherWs of this.ctx.getWebSockets()) {
      if (otherWs !== ws) {
        try { otherWs.send(payload); } catch { /* closed */ }
      }
    }
    // Schedule storage cleanup once the room goes empty.
    // getWebSockets() still includes `ws` at this point (closed but not yet removed),
    // so a count of 1 means this is the last client.
    if (this.ctx.getWebSockets().length <= 1) {
      await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL_MS);
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  /**
   * Called by the Workers runtime when our scheduled alarm fires.
   * If the room is still empty, wipe all persisted storage so the
   * Durable Object can be garbage-collected by the platform.
   * If someone reconnected in the meantime, reschedule for another TTL.
   */
  async alarm(): Promise<void> {
    if (this.ctx.getWebSockets().length > 0) {
      // Room came back to life — push the deadline out.
      await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL_MS);
      return;
    }
    await this.ctx.storage.deleteAll();
    this.nodes = [];
    this.edges = [];
  }
}
