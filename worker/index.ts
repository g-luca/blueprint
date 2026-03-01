export { BlueprintRoom }    from './room';
export { RoomRateLimiter } from './rateLimiter';

interface Env {
  BLUEPRINT_ROOM:    DurableObjectNamespace;
  ROOM_RATE_LIMITER: DurableObjectNamespace;
  ASSETS: Fetcher;
  /** Allowed CORS origin. Defaults to '*' when not set. */
  CORS_ORIGIN?: string;
  /** Per-IP room creation limit. Defaults to 10/day. Set higher in dev (e.g. RATE_LIMIT=1000). */
  RATE_LIMIT?: string;
}

/** Valid room IDs: 1–50 URL-safe characters produced by nanoid. */
const ROOM_ID_RE = /^[A-Za-z0-9_-]{1,50}$/;

/**
 * Inject security headers into any non-WebSocket response.
 * 101 Switching Protocols responses carry a `webSocket` property that cannot
 * survive reconstruction via `new Response(body, init)`, so we pass them through.
 */
function withSecurityHeaders(response: Response): Response {
  if (response.status === 101) return response;
  const modified = new Response(response.body, response);
  modified.headers.set('X-Content-Type-Options', 'nosniff');
  modified.headers.set('X-Frame-Options', 'DENY');
  modified.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  modified.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // HSTS: 1 year, include subdomains. Safe to set on all responses since the
  // worker only runs behind Cloudflare's TLS termination in production.
  modified.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  return modified;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/collab/')) {
      const segments = url.pathname.split('/').filter(Boolean);
      const roomId = segments[1]; // segments[0] = 'collab'

      if (!roomId || !ROOM_ID_RE.test(roomId)) {
        return new Response('Invalid room ID', { status: 400 });
      }

      // ── Rate-limit room creation ──────────────────────────────────────────
      // All room creations go through POST /collab/<roomId>/init.
      // For POST requests we must buffer the body into an ArrayBuffer BEFORE
      // making any inter-DO call: Miniflare marks the original request's body
      // stream as disturbed after the first internal DO fetch(), making the
      // request unreconstructable.  Buffering + reconstructing avoids this.
      let roomRequest: Request = request;
      const isInitPost = segments[2] === 'init' && request.method === 'POST';
      if (isInitPost) {
        const bodyBuffer = await request.arrayBuffer();

        const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
        const rateLimiterId = env.ROOM_RATE_LIMITER.idFromName(ip);
        const rlResp = await env.ROOM_RATE_LIMITER.get(rateLimiterId).fetch(
          new Request('http://internal/limit'),
        );
        const { success } = await rlResp.json() as { success: boolean };
        if (!success) {
          return new Response('Too many rooms created today. Try again tomorrow.', {
            status: 429,
            headers: {
              'Retry-After': '86400',
              'Access-Control-Allow-Origin': env.CORS_ORIGIN ?? '*',
            },
          });
        }

        // Reconstruct the request with the buffered body so the room DO can read it.
        roomRequest = new Request(request, { body: bodyBuffer });
      }

      const id = env.BLUEPRINT_ROOM.idFromName(roomId);
      return withSecurityHeaders(await env.BLUEPRINT_ROOM.get(id).fetch(roomRequest));
    }

    // Serve the SPA for everything else.
    return withSecurityHeaders(await env.ASSETS.fetch(request));
  },
};
