# Blueprint — System Design Canvas

An Excalidraw-like drag-and-drop canvas for drawing software architecture diagrams, built with ReactFlow.

## Stack

| Tool | Version |
|---|---|
| Vite | 6 + `@vitejs/plugin-react` + `@tailwindcss/vite` |
| React | 19 + TypeScript (strict) |
| Canvas engine | `@xyflow/react` v12 |
| State | Zustand v5 |
| Icons | `lucide-react` + `react-icons` + custom inline SVGs in `src/icons/` |
| PNG export | `html-to-image` |
| IDs | `nanoid` |
| CSS | Tailwind v4 — uses `@import "tailwindcss"` (no config file) |
| Color picker | `react-colorful` |
| OpenAPI viewer | `@scalar/api-reference-react` + `@scalar/openapi-types` |

## @xyflow/react v12 Patterns

**Always use named imports** — there is no default export:
```ts
import { ReactFlow, Background, Handle, NodeResizer, useReactFlow, useStore, ... } from '@xyflow/react';
```

`NodeProps<T>` and `EdgeProps<T>` require the **full** Node/Edge type:
```ts
// Correct:
NodeProps<AppNode>           // AppNode = Node<BaseNodeData, NodeType>
EdgeProps<AppEdge>           // AppEdge = Edge<FlowEdgeData, 'flow' | 'labeled'>
```

`nodeTypes` and `edgeTypes` need `as NodeTypes` / `as EdgeTypes` cast.

`useReactFlow()` and `useStore()` are available anywhere inside `<ReactFlowProvider>` (mounted at root in `main.tsx`).

## Node Types (26)

### Shape Primitives
| Type | Notes |
|---|---|
| `text` | Free-text annotation — `multilineLabel` enabled, Enter inserts newlines |
| `line` | SVG line/divider — orientations: h/v/d1/d2; strokeStyle: solid/dotted/dashed; no BaseNode |
| `rectangle` | Plain rectangle, no icon |
| `circle` | `borderRadius: 50%` |

### Infrastructure Nodes
| Type | Accent | Special behaviour |
|---|---|---|
| `browser` | sky | Client emitter (animates by default) |
| `ios` | sky | Client emitter |
| `android` | sky | Client emitter |
| `tv` | sky | Client emitter |
| `watch` | sky | Client emitter |
| `vr` | sky | Client emitter |
| `dns` | cyan | Broadcast node |
| `cloudflare` | orange | Broadcast, default RPS=3k, single-domain editor in footer |
| `subdomain` | indigo | Broadcast, record type pills (A/CNAME/AAAA) in footer, label = address |
| `cdn` | yellow | Broadcast |
| `loadbalancer` | green | Splits RPS, LB policy selector in footer (RR/Rand/LC/Hash) |
| `firewall` | red | Broadcast |
| `service` | blue | Forwarder, splits RPS |
| `apigateway` | violet | Broadcast (full RPS to every outgoing edge) |
| `container` | teal | Forwarder |
| `database` | indigo | Forwarder |
| `cache` | rose | Forwarder |
| `storage` | amber | Forwarder |
| `messagequeue` | purple | Forwarder |

### API Modelling Nodes
| Type | Notes |
|---|---|
| `apispecification` | Root OpenAPI spec node — title, version, serverUrl, securitySchemes in footer |
| `apiservice` | Service tag group with `pathPrefix`; connected endpoints inherit its tag & prefix |
| `endpoint` | REST/gRPC/WS/RPC endpoint — method, path, request fields, responses, headers, security; **observer**: receives full upstream RPS without diluting the split |

## Key Files

| File | Purpose |
|---|---|
| `src/themes/index.ts` | All CSS token values for 3 themes |
| `src/store/useFlowStore.ts` | All node/edge state, mutations, undo/redo history |
| `src/nodes/BaseNode.tsx` | Shared shell: handles, label edit, font panel, text section, resize, footer slot |
| `src/nodes/NodePanel.tsx` | Right-side inspector panel: font, size, align, text toggle, animation, throughput |
| `src/edges/AnimatedFlowEdge.tsx` | Animated dots via SVG `<animateMotion>`, RPS-driven |
| `src/utils/graphRps.ts` | `isEmitter`, `computeEffectiveRps`, `CLIENT_TYPES`, `BROADCAST_TYPES` |
| `src/utils/openapi.ts` | `generateOpenApiSpec(nodes, edges)` → OpenAPI 3.1 spec from canvas nodes |
| `src/utils/persistence.ts` | localStorage helpers + export format, `SCHEMA_VERSION`, `createExport`, `parseExport`, `MIGRATIONS` |
| `src/hooks/useDrop.ts` | Bridges sidebar palette to canvas drop |
| `src/hooks/useExport.ts` | `exportPng` (html-to-image) + `exportJson` (versioned `.blueprint.json` download) |
| `src/data/palette.ts` | Palette categories & items |
| `src/utils/nodeDefaults.ts` | `NODE_DIMENSIONS`, `NODE_DEFAULT_LABELS`, `NODE_DEFAULT_DATA` per type |
| `src/components/Canvas/Canvas.tsx` | ReactFlow wrapper, right-click drag selection, undo snapshot on drag |
| `src/utils/features.ts` | `COLLAB_ENDPOINT` + `COLLAB_ENABLED` derived from `VITE_COLLAB_ENDPOINT` |
| `src/utils/crypto.ts` | `hashPassword`, `deriveEncryptionKey`, `encryptState`, `decryptState` — Web Crypto helpers |
| `src/collab/CollabLayer.tsx` | Single collab mount point in `App.tsx`; contains Provider + Gate + AutoSave |
| `src/collab/useCollabSync.ts` | WebSocket lifecycle, message dispatch, 20 fps presence throttle |
| `src/collab/useRoom.ts` | `createRoom`, `joinRoom`, `leaveRoom`, `deleteRoom` |
| `worker/index.ts` | CF Worker entry: routing, security headers, rate-limit guard |
| `worker/room.ts` | `BlueprintRoom` Durable Object: HTTP endpoints + WebSocket handler |
| `worker/rateLimiter.ts` | `RoomRateLimiter` Durable Object: per-IP 24-hour sliding window |
| `worker/types.ts` | `CollabMessage` union — shared between worker and frontend |

## Adding a New Node Type

1. Add the type key to the union in `src/types/nodes.ts`
2. Add `width`/`height` (multiples of 20) to `NODE_DIMENSIONS` in `src/utils/nodeDefaults.ts`
3. Add default label to `NODE_DEFAULT_LABELS` in `src/utils/nodeDefaults.ts`
4. Optionally add per-type data overrides to `NODE_DEFAULT_DATA` (applied on drop)
5. Create `src/nodes/YourNode.tsx` using `BaseNode` with optional `icon`, `accentColor`, `bodyStyle`, `footer`, `labelPlaceholder`, `multilineLabel`
6. Register in `src/nodes/index.ts`
7. Add icon to `ICONS` record in `src/components/Sidebar/PaletteItem.tsx`
8. Add item to one of the 7 categories in `src/data/palette.ts` (shapes, clients, network, compute, api, data, messaging)
9. If it's a broadcast type, add to `BROADCAST_TYPES` in `src/utils/graphRps.ts`

## Theme System

3 themes: `blueprint` (default) | `dark` | `light`

- CSS vars injected on `<html>` via `useEffect` in `App.tsx` on every theme change
- All var names: `--color-*` (e.g. `--color-canvas-bg`, `--color-node-bg`, `--color-node-border`)
- Source of truth: `src/themes/index.ts`
- Blueprint: cobalt blue canvas, white node outlines, sky-300 animated dots
- In Blueprint theme, node accent colors collapse to `rgba(255,255,255,0.9)` (handled in `BaseNode`)
- Persisted to `localStorage` key `"blueprint-theme"`

## State (Zustand — useFlowStore)

```ts
// State
nodes, edges
past, future                           // undo/redo stacks (max 50)
clipboard                              // copy/paste buffer
showGrid: boolean
toast: string | null
currentFileId: string | null
currentFileName: string | null
files: SavedFile[]                     // all saved files (from blueprint-files-v1)
needsNamePrompt: boolean               // triggers Save As dialog

// Node/edge mutations
onNodesChange, onEdgesChange, onConnect
setNodes(nodes), setEdges(edges)       // remote collab updates — bypass undo stack
addNode(node)
updateNodeLabel(id, label)
updateNodeData(id, patch)
updateEdgeData(id, patch)
removeSelectedElements()
selectAll(), copySelected(), pasteClipboard()
saveSnapshot()                         // call BEFORE any undoable mutation
undo(), redo()

// File management
saveToStorage()                        // save in-place or prompt for name
saveFile(name)                         // save/update current file
saveAsFile(name)                       // always creates a new file
loadFile(id)                           // load file; if file.roomId → navigate to #room/<id>
deleteFile(id)
newCanvas()                            // clear canvas, unset currentFileId
setNeedsNamePrompt(v)
loadFromStorage()                      // no-op (legacy — init handled at module load)
clearCanvas()
importFromJson(file: File)             // parse + load a .blueprint.json; resets undo history
saveRoomSnapshot(roomId, name)         // silent upsert for collab auto-save (no toast)

// UI helpers
showToast(msg)                         // shows toast for 2 s
toggleGrid()
```

localStorage keys: `"blueprint-canvas-v1"` (legacy migration), `"blueprint-files-v1"` (multi-file list), `"blueprint-last-file-id"` (last opened file)

Every mutating action calls `saveSnapshot()` before applying changes. `Canvas.tsx` also calls `saveSnapshot` via `onNodeDragStart`.

## Animation & RPS System (`src/utils/graphRps.ts`)

- `CLIENT_TYPES`: `browser | ios | android | tv | watch | vr` — emit by default
- `BROADCAST_TYPES`: `cloudflare | cdn | dns | subdomain | firewall | apigateway` — forward full RPS to **every** outgoing edge (no split)
- All other nodes split RPS equally across outgoing edges (load-balancer semantics)
- `isEmitter(node)`: true if `data.animated === true`, false if `data.animated === false`, else checks `CLIENT_TYPES`
- `computeEffectiveRps(nodes, edges)`: Kahn's topological sort; emitters use own `data.rps` (default 1k); forwarders sum upstream. Emitter targets are excluded from outTargets (emitter-to-emitter edges don't propagate RPS).
- **`endpoint` observer rule**: endpoint nodes receive the full source RPS without being counted in the split denominator — connecting an endpoint alongside a service doesn't dilute the service's RPS.
- Edge dot timing: `edgeRps = isBroadcast ? sourceRps : sourceRps / numOutgoing`; phase stagger via `staggerSlot()` for LB policies
- LB policies: `round-robin` (sequential stagger) | `random` (hash by edge ID) | `least-conn` (first half gets slot 0) | `ip-hash` (hash by target)
- Duplicate edges between the same (source, target) pair are collapsed to one for RPS computation

## BaseNode Props

```ts
interface BaseNodeProps extends NodeProps<AppNode> {
  icon?: React.ReactNode;
  accentColor?: string;
  bodyStyle?: React.CSSProperties;   // shape overrides (borderRadius, clipPath)
  footer?: React.ReactNode;          // rendered below label/text (LB policy bar, domain editor, etc.)
  labelPlaceholder?: string;         // shown dimmed when label is empty
  multilineLabel?: boolean;          // textarea instead of input; Enter = newline, Escape = commit
}
```

## Canvas Interaction

- **Left-click + drag**: pan canvas (`panOnDrag={true}`)
- **Right-click + drag**: custom marquee selection — draws a `position:fixed` rect, on mouseup uses `getIntersectingNodes` to select nodes. Cursor forced to `crosshair` via injected `<style>` tag overriding ReactFlow's `.react-flow__pane` cursor.
- **Click node**: select
- **Delete / Backspace**: delete selected
- **Cmd+Z**: undo | **Cmd+Y / Cmd+Shift+Z**: redo
- **Cmd+A**: select all | **Cmd+C/V**: copy/paste | **Cmd+S**: save | **Cmd+O**: load

## Toolbar Menus

- **File**: New Canvas, Save (⌘S), Save As…, Open Recent, Export PNG (⌘E), Export JSON, Import JSON, Clear Canvas
- **Edit**: Undo (⌘Z), Redo (⌘Y) — grayed out when stack is empty
- **Window**: Theme selector (Blueprint/Dark/Light), Show Grid toggle

## JSON Export Format & Schema Versioning

Export/import lives in `src/utils/persistence.ts`. The wire format is:

```ts
interface BlueprintExport {
  version: number;          // always equals SCHEMA_VERSION at export time
  metadata: {
    name: string;
    createdAt: number;      // Unix ms timestamp
  };
  nodes: AppNode[];
  edges: AppEdge[];
}
```

File extension: `.blueprint.json`. Downloads are triggered via `URL.createObjectURL` in `useExport.ts`.

### Rules for schema changes

**Non-breaking changes — no version bump needed:**
- Adding optional fields to `BaseNodeData` or `FlowEdgeData` (old files simply omit them; defaults apply on load)
- Adding new node/edge types (old files without them parse fine)

**Breaking changes — bump `SCHEMA_VERSION` and add a migration:**
- Renaming or removing a field that existing files rely on
- Changing the shape of an existing field (e.g. `domains: string` → `domains: string[]`)
- Restructuring the top-level export object

### How to add a migration

1. Increment `SCHEMA_VERSION` in `persistence.ts`
2. Add a migration function keyed by the **old** version number:

```ts
const MIGRATIONS: Record<number, (data: any) => any> = {
  // Runs when loading a v1 file → upgrades it to v2
  1: (data) => ({
    ...data,
    nodes: data.nodes.map((n: AppNode) => ({
      ...n,
      data: { newField: 'default', ...n.data },
    })),
  }),
};
```

`parseExport` chains migrations automatically: a v1 file being loaded at SCHEMA_VERSION 3 runs migration 1, then 2, then 2→3.

### Import behaviour

- `parseExport` returns `null` on invalid input (non-object, missing `nodes`/`edges`, unrecognised shape) — `importFromJson` toasts an error and bails
- A plain `{ nodes, edges }` dump with no `version` field is accepted as a legacy format (name defaults to `"Imported"`)
- After import, `currentFileId` is `null` — the canvas is unsaved until the user explicitly saves it

### Multi-file system

`persistence.ts` also manages a multi-file list separate from the export format:

```ts
interface SavedFile {
  id: string;
  name: string;
  updatedAt: number;   // Unix ms
  nodes: AppNode[];
  edges: AppEdge[];
  roomId?: string;     // set by saveRoomSnapshot — links file to a collab room
}
```

localStorage keys:
- `"blueprint-files-v1"` — JSON array of `SavedFile` objects (`getAllFiles`, `upsertFile`, `removeFile`)
- `"blueprint-last-file-id"` — ID of the last-opened file (`getLastFileId`, `setLastFileId`)
- `"blueprint-canvas-v1"` — legacy single-canvas key (read once on startup for migration, never written)

On startup `useFlowStore` reads the last-file-id, finds it in the files list, and initialises `nodes`/`edges`/`currentFileId`/`currentFileName`.

## OpenAPI Generation (`src/utils/openapi.ts`)

`generateOpenApiSpec(nodes, edges)` builds a full OpenAPI 3.1 spec from the canvas. It uses three node types:
- `apispecification` — root spec (title from label, `data.apiVersion`, `data.serverUrl`, `data.securitySchemes`)
- `apiservice` — service group (`data.pathPrefix`; label becomes the tag name)
- `endpoint` — one operation (`data.protocol`, `data.method`, `data.requestFields`, `data.responses`, `data.headers`, `data.security`)

Path construction: `apiservice.pathPrefix` + `endpoint.label` (path). Endpoints inherit the tag of their connected apiservice. Security schemes (`SecurityScheme[]`) are emitted as `components.securitySchemes`.

The spec is rendered in-canvas by `@scalar/api-reference-react` (mounted in `ApiSpecificationPanel`).

## Real-time Collaboration

### Feature flag

Collab is opt-in via an environment variable. When `VITE_COLLAB_ENDPOINT` is absent the app runs fully offline.

```bash
# dev
VITE_COLLAB_ENDPOINT=http://localhost:8787 bun dev
bun run worker:dev   # separate terminal

# prod — set at build time or in hosting env
VITE_COLLAB_ENDPOINT=https://<worker-url>
```

`src/utils/features.ts` derives two exports used everywhere:
```ts
export const COLLAB_ENDPOINT: string | undefined = import.meta.env.VITE_COLLAB_ENDPOINT || undefined;
export const COLLAB_ENABLED = !!COLLAB_ENDPOINT;
```

### Frontend file structure

```
src/collab/
  CollabContext.ts          – React context: clientId, color, name, clients[], presence map
  RoomContext.ts            – React context: roomId, leaveRoom(), deleteRoom()
  useRoom.ts                – createRoom(), joinRoom(), leaveRoom(), deleteRoom() logic
  useCollabSync.ts          – WebSocket lifecycle, message dispatch, presence throttle
  CollabLayer.tsx           – Single export; wraps the App layout in App.tsx
  components/
    ShareButton.tsx         – Toolbar button (hidden when COLLAB_ENABLED=false)
    JoinModal.tsx           – Password entry dialog for joining a protected room
    OtherCursors.tsx        – SVG overlay of other users' cursors
    PresenceList.tsx        – Avatar dots in Toolbar (max 4 + overflow count)
```

`CollabLayer.tsx` is the single mounting point in `App.tsx`:
```tsx
if (!COLLAB_ENABLED) return layout;
return <CollabLayer>{layout}</CollabLayer>;
```
It contains `CollabProvider`, `CollabGate` (handles auth/join flow), and `RoomAutoSave`.

### Worker architecture (Cloudflare)

```
worker/
  index.ts          – Fetch router: routes /collab/<roomId>[/*] → BlueprintRoom DO,
                      injects 5 security headers, rate-limits POST /init
  room.ts           – BlueprintRoom Durable Object (WebSocket + HTTP)
  rateLimiter.ts    – RoomRateLimiter Durable Object (per-IP sliding window)
  types.ts          – CollabMessage union (shared with frontend)
```

Worker environment variables:
| Var | Default | Purpose |
|---|---|---|
| `CORS_ORIGIN` | `*` | `Access-Control-Allow-Origin` header value |
| `RATE_LIMIT` | `10` | Max rooms per IP per 24 h — set higher in dev (e.g. `RATE_LIMIT=1000`) |

### Room URL & identity

- Room IDs: `nanoid(21)` — 21-char URL-safe IDs, permanent (no TTL)
- URL hash: `#room/<roomId>` — CollabLayer reads this on mount
- Room ID regex in worker: `/^[A-Za-z0-9_-]{1,50}$/` — IDs longer than 50 or with invalid chars → 400
- Worker state persisted in Cloudflare DO storage: `nodes`, `edges`, `passwordHash`, `encryptedSnapshot`

### HTTP endpoints (`BlueprintRoom.fetch`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| OPTIONS | any | — | CORS preflight → 204 |
| GET | `/collab/:id/meta` | — | `{ hasPassword: bool }` — always public |
| POST | `/collab/:id/init` | — | Register room (once). Body: `{ passwordHash?: string }` (64-char lowercase hex). Blocked after first WS connects. |
| GET | `/collab/:id` | pwd? | Probe / health check → 200 |
| DELETE | `/collab/:id` | pwd? | Wipe all storage (nodes, edges, password) → 204 |
| GET (Upgrade) | `/collab/:id` | pwd? | WebSocket upgrade → 101 |

Password check applies to DELETE, probe GET, and WS upgrade — not to `/meta` or `/init`.

### WebSocket message protocol (`worker/types.ts`)

All messages are JSON strings. The server never echoes back to the sender.

```ts
type CollabMessage =
  | { type: 'welcome';      clientId; color; name; clients: {clientId,color,name}[];
      snapshot: {nodes,edges} | {iv,ciphertext} }   // plain or encrypted
  | { type: 'client_joined'; clientId; color; name }
  | { type: 'client_left';  clientId }
  | { type: 'state_update'; senderId; nodes: Record[]; edges: Record[] }  // plain
  | { type: 'state_update'; senderId; iv: string; ciphertext: string }    // encrypted
  | { type: 'presence';     senderId; cursor: {x,y} | null; color; name }
```

**Connection flow:**
1. Server calls `acceptWebSocket(server, [clientId, color, name])` — tags stored on WS
2. Broadcasts `client_joined` to all existing sockets
3. Sends `welcome` to new socket with current snapshot + existing clients list

**`state_update`:** Two variants. Plain (`nodes`/`edges` arrays): server validates both are arrays then stores and relays. Encrypted (`iv`+`ciphertext` strings): server relays the opaque blob unchanged — it never decrypts. The two are mutually exclusive per room based on whether a password is set. `senderId` is always taken from server-side tags (not the message body — spoofing prevented).

**`presence`:** Cursor must be `null` or `{x: finite, y: finite}`. NaN/Infinity/non-object cursors are silently dropped.

**`client_left`:** Sent by server on `webSocketClose` and `webSocketError`. If the closing socket has no tags (never registered), the handler returns early with no broadcast.

### WebSocket limits & constraints

- Max connections per room: **20** (21st gets 503)
- Max message size: **512 KB** — larger messages close the socket with code 1009
- Malformed JSON: silently ignored (no relay, no error)
- Unknown message types: silently ignored

### Client identity & presence

- `clientId`: `nanoid(8)` assigned at connect
- `color`: cycles through 8 fixed colors by connection index
- `name`: random `"<Adjective> <Animal>"` from 40×40 vocabulary, unique within the room
- Tags `[clientId, color, name]` stored on the WS via `ctx.acceptWebSocket` — retrieved with `ctx.getTags(ws)` in all handlers
- Presence throttled at **20 fps** (50 ms) in `useCollabSync.ts`; `null` cursor sent immediately on mouse leave

### CollabGate states

`CollabLayer` manages a gate state machine before showing the canvas:
- `joining` — probing `/meta`, optionally showing `JoinModal` for password
- `joined` — WS connected, canvas active
- `offline-cached` — WS failed but localStorage has a snapshot → shows canvas with "Offline — showing cached version" banner + Retry button

### End-to-end Encryption (`src/utils/crypto.ts`)

Password-protected rooms use client-side AES-GCM-256 encryption. The server stores and relays an opaque ciphertext it cannot read.

**Key derivation** — `deriveEncryptionKey(password, roomId)`:
- PBKDF2, 100 000 iterations, SHA-256, `roomId` as salt (unique per room, never stored)
- Returns a non-extractable `CryptoKey` for AES-GCM-256 encrypt + decrypt
- Separate from the auth hash: `hashPassword` (SHA-256 of the password) is used for the `?pwd=` query param; `deriveEncryptionKey` is used for canvas content

**Encryption** — `encryptState(key, nodes, edges)`:
- Serialises `{ nodes, edges }` as JSON, encrypts with a fresh random 12-byte IV
- Returns `{ iv: base64, ciphertext: base64 }`

**Decryption** — `decryptState(key, { iv, ciphertext })`:
- Reverses the above; throws on wrong key or tampered ciphertext (AES-GCM authentication tag)

**Client flow:**
- Creator: `createRoom(password)` calls `hashPassword` + `deriveEncryptionKey` in parallel; `encryptionKey` stored in `useRoom` state
- Joiner: `onJoin(rawPassword)` in `CollabGate` calls the same two functions in parallel; key stored in gate state
- Key flows: `useRoom` → `CollabLayer` → `CollabGate` → `CollabProvider` → `useCollabSync`
- Unprotected rooms: `encryptionKey` is `undefined` throughout; plain path taken

**`useCollabSync` with encryption:**
- `sendStateUpdate()` is async; when `encryptionKey` is set it calls `encryptState` before sending `{ iv, ciphertext }` variant
- `ws.onmessage` runs as `void (async () => { ... })()` to support `await decryptState()`
- Welcome snapshot: detects `'iv' in snap` to decide between decrypt and direct load
- Incoming `state_update`: detects `'iv' in msg` to decide between decrypt and direct apply
- Decryption failures are silently swallowed (wrong key or tampered data → no canvas update)

### Rate limiter (`RoomRateLimiter` DO)

- One DO instance per IP (`idFromName(ip)`), keyed by `CF-Connecting-IP` (falls back to `"unknown"`)
- Rolling 24-hour window: allows `RATE_LIMIT` (default 10) room creations, blocks with 429 + `Retry-After: 86400`
- State persisted to DO storage (`count`, `resetAt`) — survives worker restarts
- **Dev tip:** delete `.wrangler/state/v3/do/blueprint-RoomRateLimiter/` to reset the counter

### Security headers (injected by `withSecurityHeaders` in `index.ts`)

Applied to all non-101 responses: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`. 101 responses are passed through unmodified (the `webSocket` property cannot survive `new Response(...)` reconstruction).

### Tests

```
tests/setup.ts          – Mocks `cloudflare:workers` DurableObject for bun:test (preloaded via bunfig.toml)
tests/worker/
  helpers.ts          – MockStorage, MockDOState, FakeWebSocket, FakeWebSocketPair, makeRequest
  room.test.ts        – 77 tests: HTTP endpoints, WS connection/welcome, state_update (plain +
                        encrypted), presence, client_left, size limits, malformed messages
  index.test.ts       – 22 tests: routing, security headers, rate limiting
  rateLimiter.test.ts – 6 tests: window, limit, persistence
tests/frontend/
  crypto.test.ts      – 16 tests: hashPassword, deriveEncryptionKey, encryptState/decryptState
  graphRps.test.ts    – 16 tests: RPS propagation
  persistence.test.ts – 17 tests: export format, migrations, localStorage helpers
```

Run commands:
```bash
bun test tests/           # all tests
bun test tests/worker/    # worker only
bun test tests/frontend/  # frontend only
bun test --coverage tests/ # with coverage
```

`bunfig.toml` sets `preload = ["./tests/setup.ts"]` — this mock lets worker code import `cloudflare:workers` in bun. `FakeWebSocketPair` captures the server-side socket via `lastServerSocket` so tests can inspect `ws.send.mock.calls`. `connect()` helper returns `{ serverWs, welcome }` after clearing send history.

## CI (GitHub Actions — `.github/workflows/ci.yml`)

Triggers on push to `main` or `luca/**` branches, and on PRs to `main`. Three jobs:

1. **typecheck** — `bun run typecheck` (`tsc --noEmit && tsc -p tsconfig.worker.json --noEmit`)
2. **test** — `bun test tests/`
3. **build** — `bun run build` (needs typecheck + test); reads `VITE_COLLAB_ENDPOINT` from GitHub secrets

## Important Notes

- `deleteKeyCode={null}` on ReactFlow — deletion handled by `useKeyboardShortcuts`
- Grid snap: `snapToGrid={true}`, `snapGrid={[20, 20]}` — all node dimensions must be multiples of 20
- `NODE_DEFAULT_DATA` in `nodeDefaults.ts` applies per-type data on drop (e.g. `cloudflare: { rps: 3 }`)
- **Never use NodeToolbar** — portal causes deselection before onClick fires; use `position:absolute` div with `onMouseDown={stopPropagation}`
- NodePanel is shown as a fixed `position:absolute` overlay in Canvas (not inside ReactFlow's node tree)
- Right-click drag selection: crosshair cursor injected via `<style>` tag (not inline style — ReactFlow's `.react-flow__pane` has explicit cursor that overrides inherited styles)
- Scaffold manually if `bun create vite` fails (`.claude` directory causes existing-dir error)
- `react-icons` is also installed (used for `SiCloudflare`, `MdHub`, etc.) alongside `lucide-react`
- `ReplicaStack.tsx` exports `ReplicaRows` (footer component) and `replicaNodeHeight(n)` — used by nodes that show replica counts in their footer; not a node type itself
- `.env.production.example` documents the required env var: `VITE_COLLAB_ENDPOINT=https://blueprint.your-account.workers.dev`
