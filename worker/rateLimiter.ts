import { DurableObject } from 'cloudflare:workers';

const DEFAULT_LIMIT = 10;
const WINDOW_MS = 24 * 60 * 60 * 1000;

interface Env {
  /** Override the per-IP room creation limit. Useful for local dev (e.g. RATE_LIMIT=1000). */
  RATE_LIMIT?: string;
}

/**
 * Per-IP rate limiter for room creation.
 *
 * One Durable Object instance is created per IP address (keyed by
 * `idFromName(ip)` in the Worker entry point).  The DO is serialised,
 * so there are no race conditions even under concurrent requests.
 *
 * Storage layout:
 *   count   – number of rooms created in the current window
 *   resetAt – Unix ms timestamp when the window resets
 */
export class RoomRateLimiter extends DurableObject<Env> {
  private count = 0;
  private resetAt = 0;
  private readonly limit: number;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    const parsed = parseInt(env.RATE_LIMIT ?? '', 10);
    // Fall back to DEFAULT_LIMIT for missing, zero, negative, or non-numeric values.
    this.limit = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LIMIT;
    this.ctx.blockConcurrencyWhile(async () => {
      this.count   = (await this.ctx.storage.get<number>('count'))   ?? 0;
      this.resetAt = (await this.ctx.storage.get<number>('resetAt')) ?? 0;
    });
  }

  async fetch(_request: Request): Promise<Response> {
    const now = Date.now();

    // Roll the window forward if it has expired.
    if (now >= this.resetAt) {
      this.count   = 0;
      this.resetAt = now + WINDOW_MS;
    }

    if (this.count >= this.limit) {
      return Response.json({ success: false, resetAt: this.resetAt });
    }

    this.count++;
    // Fire-and-forget — the DO is already serialised so the in-memory
    // values are always up to date; storage is just for crash recovery.
    void Promise.all([
      this.ctx.storage.put('count',   this.count),
      this.ctx.storage.put('resetAt', this.resetAt),
    ]);

    return Response.json({ success: true });
  }
}
