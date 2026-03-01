import { describe, it, expect, beforeEach } from 'bun:test';
import { RoomRateLimiter } from '../../worker/rateLimiter';
import { MockStorage, MockDOState } from './helpers';

describe('RoomRateLimiter', () => {
  let state: MockDOState;
  let limiter: RoomRateLimiter;

  const limitReq = () => new Request('http://internal/limit');

  beforeEach(() => {
    state = new MockDOState();
    limiter = new RoomRateLimiter(state as never, {} as never);
  });

  it('allows the first request', async () => {
    const resp = await limiter.fetch(limitReq());
    const body = await resp.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('allows up to 10 requests within the window', async () => {
    for (let i = 0; i < 9; i++) {
      await limiter.fetch(limitReq());
    }
    const resp = await limiter.fetch(limitReq()); // 10th
    const body = await resp.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('blocks the 11th request', async () => {
    for (let i = 0; i < 10; i++) {
      await limiter.fetch(limitReq());
    }
    const resp = await limiter.fetch(limitReq()); // 11th — over limit
    const body = await resp.json() as { success: boolean };
    expect(body.success).toBe(false);
  });

  it('returns resetAt in the blocked response', async () => {
    for (let i = 0; i < 10; i++) {
      await limiter.fetch(limitReq());
    }
    const resp = await limiter.fetch(limitReq());
    const body = await resp.json() as { success: boolean; resetAt: number };
    expect(typeof body.resetAt).toBe('number');
    expect(body.resetAt).toBeGreaterThan(Date.now());
  });

  it('resets the window when resetAt has passed', async () => {
    // Seed storage with a fully used, expired window
    const expiredStorage = new MockStorage();
    await expiredStorage.put('count', 10);
    await expiredStorage.put('resetAt', Date.now() - 1); // 1 ms in the past

    const expiredState = {
      storage: expiredStorage,
      blockConcurrencyWhile: async (fn: () => Promise<void>) => fn(),
    };
    const freshLimiter = new RoomRateLimiter(expiredState as never, {} as never);

    const resp = await freshLimiter.fetch(limitReq());
    const body = await resp.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('persists the count to storage after a successful request', async () => {
    await limiter.fetch(limitReq());
    // The storage write is fire-and-forget; flush microtasks.
    await Promise.resolve();
    const count = await state.storage.get<number>('count');
    expect(count).toBe(1);
  });

  describe('RATE_LIMIT env var parsing', () => {
    async function makeWithEnv(rateLimit: string | undefined) {
      const s = new MockDOState();
      const l = new RoomRateLimiter(s as never, { RATE_LIMIT: rateLimit } as never);
      // blockConcurrencyWhile runs two async storage reads before completing.
      // Yield to the event loop so those microtasks drain before any fetch runs,
      // matching the behaviour of beforeEach-created instances (bun drains microtasks
      // between beforeEach and the test body).
      await new Promise((resolve) => setTimeout(resolve, 0));
      return l;
    }

    it('respects a positive custom limit', async () => {
      const l = await makeWithEnv('3');
      for (let i = 0; i < 3; i++) await l.fetch(limitReq());
      const resp = await l.fetch(limitReq()); // 4th — over limit
      expect((await resp.json() as { success: boolean }).success).toBe(false);
    });

    it('RATE_LIMIT=0 falls back to default — first request is not immediately blocked', async () => {
      const l = await makeWithEnv('0');
      const resp = await l.fetch(limitReq());
      expect((await resp.json() as { success: boolean }).success).toBe(true);
    });

    it('RATE_LIMIT=-1 falls back to default — first request is not immediately blocked', async () => {
      const l = await makeWithEnv('-1');
      const resp = await l.fetch(limitReq());
      expect((await resp.json() as { success: boolean }).success).toBe(true);
    });

    it('non-numeric RATE_LIMIT falls back to default — first request is not immediately blocked', async () => {
      const l = await makeWithEnv('abc');
      const resp = await l.fetch(limitReq());
      expect((await resp.json() as { success: boolean }).success).toBe(true);
    });
  });
});
