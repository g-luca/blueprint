import { DurableObject } from 'cloudflare:workers';
import { nanoid } from 'nanoid';
import type { CollabMessage, EncryptedBlob } from './types';

const encoder = new TextEncoder();

interface Env {
  /** Allowed CORS origin. Defaults to '*' when not set. */
  CORS_ORIGIN?: string;
}

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

function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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

export class BlueprintRoom extends DurableObject<Env> {
  private nodes: Record<string, unknown>[] = [];
  private edges: Record<string, unknown>[] = [];
  /** Non-null when the room is password-protected and has received an encrypted state_update. */
  private encryptedSnapshot: EncryptedBlob | null = null;
  private readonly origin: string;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.origin = env.CORS_ORIGIN ?? '*';
    // Restore persisted state on every (re)construction, including after hibernation.
    // Errors are caught so a storage failure doesn't stall every incoming request.
    this.ctx.blockConcurrencyWhile(async () => {
      try {
        this.nodes = (await this.ctx.storage.get<Record<string, unknown>[]>('nodes')) ?? [];
        this.edges = (await this.ctx.storage.get<Record<string, unknown>[]>('edges')) ?? [];
        this.encryptedSnapshot = (await this.ctx.storage.get<EncryptedBlob>('encryptedSnapshot')) ?? null;
        // Defensive: storage corruption shouldn't break the DO
        if (!Array.isArray(this.nodes)) this.nodes = [];
        if (!Array.isArray(this.edges)) this.edges = [];
      } catch {
        this.nodes = [];
        this.edges = [];
        this.encryptedSnapshot = null;
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(this.origin) });
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
      return Response.json({ hasPassword }, { headers: corsHeaders(this.origin) });
    }

    // ── POST /collab/<roomId>/init ──────────────────────────────────────────
    // Registers a room exactly once, optionally with a password hash.
    // Blocked after the first call (with or without a password) to prevent a
    // second caller from adding a password to a previously passwordless room —
    // a narrow but real race before the creator's WebSocket connects.
    // Also blocked once any WebSocket is active, since the creator is now live.
    if (isSubRoute && subRoute === 'init' && request.method === 'POST') {
      // Block /init once anyone has connected — the room is "live".
      const activeSessions = this.ctx.getWebSockets().length;
      const cors = corsHeaders(this.origin);

      if (activeSessions > 0) {
        return new Response('Room already has active sessions', { status: 409, headers: cors });
      }

      // Block re-initialization regardless of whether a password was set.
      // Checking only 'passwordHash' would allow a second caller to add a
      // password to a room created without one.
      const initialized = await this.ctx.storage.get<boolean>('initialized');
      if (initialized) {
        return new Response('Room already initialized', { status: 409, headers: cors });
      }

      // Guard against huge bodies before parsing JSON.
      const contentLength = parseInt(request.headers.get('Content-Length') ?? '0', 10);
      if (contentLength > MAX_INIT_BODY_BYTES) {
        return new Response('Request body too large', { status: 413, headers: cors });
      }

      // Parse body only when there is one. An empty POST registers a
      // no-password room (exists solely to pass through the rate limiter).
      let body: { passwordHash?: unknown } = {};
      if (Number.isFinite(contentLength) && contentLength > 0) {
        try {
          body = await request.json() as { passwordHash?: unknown };
        } catch {
          return new Response('Invalid JSON', { status: 400, headers: cors });
        }
      }

      if (body.passwordHash !== undefined) {
        if (typeof body.passwordHash !== 'string' ||
            body.passwordHash.length !== 64 ||
            !/^[0-9a-f]{64}$/.test(body.passwordHash)) {
          return new Response('passwordHash must be a 64-char lowercase hex string', { status: 400, headers: cors });
        }
        await this.ctx.storage.put('passwordHash', body.passwordHash);
      }

      // Mark the room as initialized so subsequent /init calls are rejected,
      // even if no password was stored (passwordless rooms).
      await this.ctx.storage.put('initialized', true);
      return new Response('OK', { headers: cors });
    }

    // ── Password check (probe GETs, DELETE, and WS upgrades) ────────────────
    const storedHash = await this.ctx.storage.get<string>('passwordHash');
    if (storedHash) {
      const provided = url.searchParams.get('pwd');
      if (!provided || provided !== storedHash) {
        return new Response('Unauthorized', { status: 403, headers: corsHeaders(this.origin) });
      }
    }

    // ── DELETE room ──────────────────────────────────────────────────────────
    if (request.method === 'DELETE') {
      await this.ctx.storage.deleteAll();
      this.nodes = [];
      this.edges = [];
      this.encryptedSnapshot = null;
      // Disconnect all live clients so they don't inadvertently resurrect the room
      // by sending state_update messages after the storage has been wiped.
      for (const ws of this.ctx.getWebSockets()) {
        try { ws.close(4000, 'Room deleted'); } catch { /* already closed */ }
      }
      return new Response(null, { status: 204, headers: corsHeaders(this.origin) });
    }

    // ── Non-WebSocket probe ─────────────────────────────────────────────────
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('OK', { headers: corsHeaders(this.origin) });
    }

    // ── WebSocket upgrade ───────────────────────────────────────────────────
    const pair = new WebSocketPair();
    const client = pair[0] as WebSocket;
    const server = pair[1] as WebSocket;

    const clientId = nanoid(8);
    // getWebSockets() BEFORE acceptWebSocket: count is the number of *other* active connections.
    // The DO serialises fetch() handlers, so this count is stable for the duration of this call.
    const existingSockets = this.ctx.getWebSockets();
    const existingCount = existingSockets.length;

    if (existingCount >= MAX_CONNECTIONS) {
      return new Response('Room is full', { status: 503, headers: corsHeaders(this.origin) });
    }

    const color = COLORS[existingCount % COLORS.length];

    // Single pass: collect used names and build the other-clients list for the welcome message.
    const usedNames = new Set<string>();
    const otherClients: { clientId: string; color: string; name: string }[] = [];
    for (const ws of existingSockets) {
      const [cid, col, nam] = this.ctx.getTags(ws);
      if (nam) usedNames.add(nam);
      otherClients.push({ clientId: cid ?? '', color: col ?? '#ffffff', name: nam ?? 'User' });
    }
    const name = randomName(usedNames);

    this.ctx.acceptWebSocket(server, [clientId, color, name]);

    // Broadcast client_joined to all existing sockets before sending welcome.
    const joinedMsg: CollabMessage = { type: 'client_joined', clientId, color, name };
    const joinedPayload = JSON.stringify(joinedMsg);
    for (const ws of existingSockets) {
      try { ws.send(joinedPayload); } catch { /* closed */ }
    }

    const welcome: CollabMessage = {
      type: 'welcome',
      clientId,
      color,
      name,
      clients: otherClients,
      snapshot: this.encryptedSnapshot ?? { nodes: this.nodes, edges: this.edges },
    };
    server.send(JSON.stringify(welcome));

    return new Response(null, { status: 101, webSocket: client });
  }

  private broadcastExcept(sender: WebSocket, payload: string): void {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws !== sender) {
        try { ws.send(payload); } catch { /* closed */ }
      }
    }
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    // Enforce size limit before any parsing.
    // For strings, encode to UTF-8 to get the true byte count — JS .length
    // counts UTF-16 code units which can undercount multi-byte characters.
    const byteLength = typeof message === 'string'
      ? encoder.encode(message).byteLength
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
      // Encrypted variant: { iv, ciphertext } — relay opaque blob, server never decrypts.
      if ('iv' in msg && typeof msg.iv === 'string' && 'ciphertext' in msg && typeof msg.ciphertext === 'string') {
        this.encryptedSnapshot = { iv: msg.iv, ciphertext: msg.ciphertext };
        // Clear stale plain state so DO storage doesn't accumulate dead data.
        this.nodes = [];
        this.edges = [];
        void Promise.all([
          this.ctx.storage.put('encryptedSnapshot', this.encryptedSnapshot),
          this.ctx.storage.delete('nodes'),
          this.ctx.storage.delete('edges'),
        ]).catch((e) => console.error('persist encryptedSnapshot:', e));
        const relay: CollabMessage = {
          type: 'state_update',
          senderId: clientId,
          iv: msg.iv,
          ciphertext: msg.ciphertext,
        };
        this.broadcastExcept(ws, JSON.stringify(relay));
        return;
      }

      // Plain variant: { nodes, edges } — reject non-array payloads to prevent corruption.
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
      this.broadcastExcept(ws, JSON.stringify(relay));
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
      this.broadcastExcept(ws, JSON.stringify(relay));
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const tags = this.ctx.getTags(ws);
    const clientId = tags[0];
    if (!clientId) return;
    const msg: CollabMessage = { type: 'client_left', clientId };
    this.broadcastExcept(ws, JSON.stringify(msg));
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }
}
