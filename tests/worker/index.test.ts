import { describe, it, expect, vi, beforeEach } from 'bun:test';
import worker from '../../worker/index';

// ── Minimal DO namespace mock ────────────────────────────────────────────────

function makeDONamespace(fetchImpl: (req: Request) => Promise<Response>) {
  return {
    idFromName: (_name: string) => ({ name: _name }),
    get: () => ({ fetch: fetchImpl }),
  };
}

// ── Env setup ────────────────────────────────────────────────────────────────

const roomFetch = vi.fn<[Request], Promise<Response>>();
const rateLimitFetch = vi.fn<[Request], Promise<Response>>();
const assetsFetch = vi.fn<[Request], Promise<Response>>();

const env = {
  BLUEPRINT_ROOM: makeDONamespace(roomFetch),
  ROOM_RATE_LIMITER: makeDONamespace(rateLimitFetch),
  ASSETS: { fetch: assetsFetch },
} as never;

function req(path: string, method = 'GET', init: RequestInit = {}): Request {
  return new Request(`https://blueprint.example.com${path}`, { method, ...init });
}

beforeEach(() => {
  vi.clearAllMocks();
  roomFetch.mockImplementation(async () => new Response('OK', { status: 200 }));
  rateLimitFetch.mockImplementation(async () =>
    new Response(JSON.stringify({ success: true }), { status: 200 }),
  );
  assetsFetch.mockImplementation(async () => new Response('SPA', { status: 200 }));
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('worker router', () => {
  it('serves the SPA for non-collab paths', async () => {
    const resp = await worker.fetch(req('/'), env);
    expect(assetsFetch).toHaveBeenCalled();
    expect(resp.status).toBe(200);
  });

  it('routes /collab/<roomId> to BLUEPRINT_ROOM', async () => {
    await worker.fetch(req('/collab/abc123'), env);
    expect(roomFetch).toHaveBeenCalled();
  });

  it('deflects path traversal attempts to ASSETS (URL constructor normalises the path)', async () => {
    // new URL() resolves /collab/../secret → /secret, which does not start with /collab/
    // so the worker serves it as a normal SPA asset rather than routing to any DO.
    const resp = await worker.fetch(req('/collab/../secret'), env);
    expect(assetsFetch).toHaveBeenCalled();
    expect(roomFetch).not.toHaveBeenCalled();
    expect(resp.status).toBe(200);
  });

  it('rejects room IDs longer than 50 characters', async () => {
    const longId = 'a'.repeat(51);
    const resp = await worker.fetch(req(`/collab/${longId}`), env);
    expect(resp.status).toBe(400);
  });

  it('does not call BLUEPRINT_ROOM for an invalid room ID', async () => {
    await worker.fetch(req('/collab/../bad'), env);
    expect(roomFetch).not.toHaveBeenCalled();
  });

  it('returns 400 for an empty room ID (/collab/ with no segment)', async () => {
    const resp = await worker.fetch(req('/collab/'), env);
    expect(resp.status).toBe(400);
    expect(roomFetch).not.toHaveBeenCalled();
  });

  it('returns 400 for room IDs containing invalid characters', async () => {
    const resp = await worker.fetch(req('/collab/room$id'), env);
    expect(resp.status).toBe(400);
  });

  it('accepts a room ID of exactly 50 characters', async () => {
    await worker.fetch(req(`/collab/${'a'.repeat(50)}`), env);
    expect(roomFetch).toHaveBeenCalled();
  });

  it('routes /collab (no trailing slash) to ASSETS, not the room DO', async () => {
    // /collab does not start with /collab/ so it falls through to the SPA
    await worker.fetch(req('/collab'), env);
    expect(assetsFetch).toHaveBeenCalled();
    expect(roomFetch).not.toHaveBeenCalled();
  });
});

describe('security headers', () => {
  it('injects X-Content-Type-Options: nosniff', async () => {
    const resp = await worker.fetch(req('/'), env);
    expect(resp.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('injects X-Frame-Options: DENY', async () => {
    const resp = await worker.fetch(req('/'), env);
    expect(resp.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('injects Strict-Transport-Security with 1-year max-age', async () => {
    const resp = await worker.fetch(req('/'), env);
    expect(resp.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
  });

  it('injects Referrer-Policy', async () => {
    const resp = await worker.fetch(req('/'), env);
    expect(resp.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });

  it('injects Permissions-Policy', async () => {
    const resp = await worker.fetch(req('/'), env);
    expect(resp.headers.get('Permissions-Policy')).toBeTruthy();
  });

  it('passes 101 Switching Protocols responses through without adding security headers', async () => {
    // The worker cannot reconstruct a 101 response (webSocket property is lost),
    // so it returns it unmodified.
    roomFetch.mockImplementationOnce(async () => new Response(null, { status: 101 }));
    const resp = await worker.fetch(req('/collab/abc'), env);
    expect(resp.status).toBe(101);
    expect(resp.headers.get('X-Content-Type-Options')).toBeNull();
  });
});

describe('rate limiting', () => {
  it('forwards /collab/:id/init POST to the room DO when under limit', async () => {
    await worker.fetch(
      req('/collab/abc/init', 'POST', {
        headers: { 'CF-Connecting-IP': '1.2.3.4', 'Content-Length': '2' },
        body: '{}',
      }),
      env,
    );
    expect(roomFetch).toHaveBeenCalled();
  });

  it('returns 429 when the rate limiter blocks the request', async () => {
    rateLimitFetch.mockImplementationOnce(async () =>
      new Response(JSON.stringify({ success: false }), { status: 200 }),
    );
    const resp = await worker.fetch(
      req('/collab/abc/init', 'POST', {
        headers: { 'CF-Connecting-IP': '1.2.3.4', 'Content-Length': '2' },
        body: '{}',
      }),
      env,
    );
    expect(resp.status).toBe(429);
  });

  it('does not call BLUEPRINT_ROOM when rate-limited', async () => {
    rateLimitFetch.mockImplementationOnce(async () =>
      new Response(JSON.stringify({ success: false }), { status: 200 }),
    );
    await worker.fetch(
      req('/collab/abc/init', 'POST', {
        headers: { 'CF-Connecting-IP': '1.2.3.4', 'Content-Length': '2' },
        body: '{}',
      }),
      env,
    );
    expect(roomFetch).not.toHaveBeenCalled();
  });

  it('falls back to IP "unknown" when CF-Connecting-IP is absent', async () => {
    await worker.fetch(
      req('/collab/abc/init', 'POST', { headers: { 'Content-Length': '2' }, body: '{}' }),
      env,
    );
    expect(rateLimitFetch).toHaveBeenCalled();
  });

  it('includes a CORS header on 429 responses', async () => {
    rateLimitFetch.mockImplementationOnce(async () =>
      new Response(JSON.stringify({ success: false }), { status: 200 }),
    );
    const resp = await worker.fetch(
      req('/collab/abc/init', 'POST', {
        headers: { 'CF-Connecting-IP': '1.2.3.4', 'Content-Length': '2' },
        body: '{}',
      }),
      env,
    );
    expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('includes a Retry-After: 86400 header on 429 responses', async () => {
    rateLimitFetch.mockImplementationOnce(async () =>
      new Response(JSON.stringify({ success: false }), { status: 200 }),
    );
    const resp = await worker.fetch(
      req('/collab/abc/init', 'POST', {
        headers: { 'CF-Connecting-IP': '1.2.3.4', 'Content-Length': '2' },
        body: '{}',
      }),
      env,
    );
    expect(resp.headers.get('Retry-After')).toBe('86400');
  });

  it('treats a missing success field in the rate limiter response as blocked (fail-safe)', async () => {
    // If the rate limiter returns {} with no success field, !undefined === true → 429
    rateLimitFetch.mockImplementationOnce(async () =>
      new Response(JSON.stringify({}), { status: 200 }),
    );
    const resp = await worker.fetch(
      req('/collab/abc/init', 'POST', {
        headers: { 'CF-Connecting-IP': '1.2.3.4', 'Content-Length': '2' },
        body: '{}',
      }),
      env,
    );
    expect(resp.status).toBe(429);
    expect(roomFetch).not.toHaveBeenCalled();
  });
});
