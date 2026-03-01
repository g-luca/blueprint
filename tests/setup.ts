import { mock } from 'bun:test';

// Mock the Cloudflare Workers virtual module so worker code can be imported in bun tests.
// In the actual CF runtime this module is provided by the platform; here we supply a minimal
// stand-in whose constructor mirrors what DurableObject does: store ctx and env on the instance.
mock.module('cloudflare:workers', () => ({
  DurableObject: class DurableObject<Env = unknown> {
    readonly ctx: unknown;
    readonly env: Env;
    constructor(ctx: unknown, env: Env) {
      this.ctx = ctx;
      this.env = env;
    }
  },
}));
