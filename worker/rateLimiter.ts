/** Maximum rooms a single IP may create within a rolling 24-hour window. */
const LIMIT = 10;
const WINDOW_MS = 24 * 60 * 60 * 1000;

interface Env {}

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
export class RoomRateLimiter {
  private count = 0;
  private resetAt = 0;

  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env,
  ) {
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

    if (this.count >= LIMIT) {
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
