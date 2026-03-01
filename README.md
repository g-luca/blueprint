# Blueprint

Drag-and-drop canvas for drawing software architecture diagrams — built with React Flow, Zustand, and Tailwind CSS v4.

## Running locally (solo mode)

No server required. The canvas runs entirely in the browser with localStorage persistence.

```bash
bun install
bun dev        # Vite on :5173
```

The Share button is **hidden by default**. To enable real-time collaboration, see below.

## Real-time collaboration

Collaboration is powered by a [Cloudflare Worker](https://workers.cloudflare.com/) with [Durable Objects](https://developers.cloudflare.com/durable-objects/) for WebSocket state sync and a per-IP rate limiter for room creation.

### Local development (with collab)

You need [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (`bun add -g wrangler`) and a Cloudflare account.

```bash
# Terminal 1 — Cloudflare Worker (Durable Objects require remote mode)
bun run worker:dev

# Terminal 2 — Vite dev server pointing at the local worker
VITE_COLLAB_ENDPOINT=http://localhost:8787 bun dev
```

The worker runs on `:8787` and the app fetches it directly via `VITE_COLLAB_ENDPOINT`.  No Vite proxy is needed; the worker sets CORS headers to allow requests from any origin during development.

### Deploying to Cloudflare

```bash
# Build the SPA and deploy worker + assets together
bun run build
bun run cf:deploy          # preview / branch deploy
bun run cf:deploy:prod     # production deploy
```

`wrangler.toml` configures:
- **Durable Objects**: `BlueprintRoom` (per-room WebSocket hub + state persistence), `RoomRateLimiter` (10 rooms / IP / day)
- **Assets**: SPA served from `./dist` with SPA fallback

### Enabling the Share button

Set `VITE_COLLAB_ENDPOINT` to your worker's URL at build time (or in a `.env` file) to show the Share button:

```bash
# .env
VITE_COLLAB_ENDPOINT=https://blueprint.<your-account>.workers.dev
```

When this variable is absent, Blueprint builds as a fully offline tool — no WebSocket code runs and no collab UI is rendered.

## Deployment (Cloudflare Pages — static only)

If you only want the canvas without collaboration:

- Build command: `bun run build`
- Build output directory: `dist`
- SPA fallback: `not_found_handling = "single-page-application"` in `wrangler.toml`

Do **not** set `VITE_COLLAB_ENDPOINT` unless you also deploy the Worker.

## Architecture

| Layer | Technology |
|---|---|
| Canvas | `@xyflow/react` v12 |
| State | Zustand v5 |
| Persistence | `localStorage` (solo) + Cloudflare Durable Objects (collab) |
| Auth | SHA-256 password hash sent with WebSocket upgrade URL |
| Rate limiting | Per-IP Durable Object (10 rooms / day) |
| Room storage | Permanent — rooms persist until explicitly deleted |

### Security notes

- Passwords are SHA-256 hashed client-side before leaving the browser; the raw password is never sent to the server.
- The hash is transmitted in the WebSocket upgrade URL (`?pwd=<hex>`) — a known trade-off since browsers cannot set `Authorization` headers on WebSocket connections. Always use HTTPS in production (the worker enforces `wss://` and sets `Strict-Transport-Security`).
- Room creation is rate-limited to 10 rooms per IP per day.
- Rooms are capped at 20 concurrent WebSocket connections and 512 KB per message.
