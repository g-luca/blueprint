import { describe, it, expect } from 'bun:test';
import {
  isEmitter,
  computeEffectiveRps,
  CLIENT_TYPES,
  BROADCAST_TYPES,
} from '../../src/utils/graphRps';

function node(id: string, type = 'service', data: Record<string, unknown> = {}) {
  return { id, type, data };
}
function edge(source: string, target: string) {
  return { source, target };
}

describe('isEmitter', () => {
  it('returns true for every CLIENT_TYPE by default', () => {
    for (const type of CLIENT_TYPES) {
      expect(isEmitter(node('n', type))).toBe(true);
    }
  });

  it('returns false for non-client types by default', () => {
    expect(isEmitter(node('n', 'service'))).toBe(false);
    expect(isEmitter(node('n', 'database'))).toBe(false);
    expect(isEmitter(node('n', 'cache'))).toBe(false);
  });

  it('data.animated=true overrides non-client type', () => {
    expect(isEmitter(node('n', 'service', { animated: true }))).toBe(true);
  });

  it('data.animated=false overrides client type', () => {
    expect(isEmitter(node('n', 'browser', { animated: false }))).toBe(false);
  });

  it('returns false when type is absent', () => {
    expect(isEmitter({ id: 'n' })).toBe(false);
  });
});

describe('computeEffectiveRps', () => {
  it('returns empty map when there are no emitters', () => {
    const nodes = [node('a', 'service'), node('b', 'database')];
    expect(computeEffectiveRps(nodes, [edge('a', 'b')]).size).toBe(0);
  });

  it('emitter with no edges gets default rps of 1', () => {
    const result = computeEffectiveRps([node('a', 'browser')], []);
    expect(result.get('a')).toBe(1);
  });

  it('emitter respects custom rps from data', () => {
    const result = computeEffectiveRps([node('a', 'browser', { rps: 5 })], []);
    expect(result.get('a')).toBe(5);
  });

  it('emitter → two services: rps splits evenly', () => {
    const nodes = [node('a', 'browser', { rps: 100 }), node('b', 'service'), node('c', 'service')];
    const result = computeEffectiveRps(nodes, [edge('a', 'b'), edge('a', 'c')]);
    expect(result.get('b')).toBe(50);
    expect(result.get('c')).toBe(50);
  });

  it('broadcast node forwards full rps to every target', () => {
    const nodes = [
      node('a', 'browser', { rps: 100 }),
      node('cdn', 'cdn'),
      node('b', 'service'),
      node('c', 'service'),
    ];
    const edges = [edge('a', 'cdn'), edge('cdn', 'b'), edge('cdn', 'c')];
    const result = computeEffectiveRps(nodes, edges);
    expect(result.get('cdn')).toBe(100);
    expect(result.get('b')).toBe(100);
    expect(result.get('c')).toBe(100);
  });

  it('all BROADCAST_TYPES forward full rps', () => {
    for (const type of BROADCAST_TYPES) {
      const nodes = [
        node('emitter', 'browser', { rps: 60 }),
        node('bcast', type),
        node('svc', 'service'),
      ];
      const result = computeEffectiveRps(nodes, [edge('emitter', 'bcast'), edge('bcast', 'svc')]);
      expect(result.get('svc')).toBe(60);
    }
  });

  it('straight chain: emitter → service → database passes full rps through', () => {
    const nodes = [node('a', 'browser', { rps: 60 }), node('b', 'service'), node('c', 'database')];
    const result = computeEffectiveRps(nodes, [edge('a', 'b'), edge('b', 'c')]);
    expect(result.get('a')).toBe(60);
    expect(result.get('b')).toBe(60);
    expect(result.get('c')).toBe(60);
  });

  it('emitter-to-emitter edges are excluded from the split denominator', () => {
    const nodes = [
      node('a', 'browser', { rps: 100 }),
      node('b', 'browser', { rps: 50 }),
      node('c', 'service'),
    ];
    const result = computeEffectiveRps(nodes, [edge('a', 'b'), edge('a', 'c')]);
    expect(result.get('c')).toBe(100);
    expect(result.get('b')).toBe(50);
  });

  it('duplicate edges between the same pair count as one', () => {
    const nodes = [node('a', 'browser', { rps: 100 }), node('b', 'service'), node('c', 'service')];
    const result = computeEffectiveRps(
      nodes,
      [edge('a', 'b'), edge('a', 'b'), edge('a', 'c')],
    );
    expect(result.get('b')).toBe(50);
    expect(result.get('c')).toBe(50);
  });

  it('stale edges to non-existent nodes are ignored', () => {
    const nodes = [node('a', 'browser', { rps: 100 }), node('b', 'service')];
    const result = computeEffectiveRps(nodes, [edge('a', 'b'), edge('a', 'ghost')]);
    expect(result.get('b')).toBe(100);
  });

  describe('endpoint node observer semantics', () => {
    it('endpoint receives the full source rps', () => {
      const nodes = [node('a', 'browser', { rps: 100 }), node('ep', 'endpoint')];
      const result = computeEffectiveRps(nodes, [edge('a', 'ep')]);
      expect(result.get('ep')).toBe(100);
    });

    it('endpoint does not count toward the split denominator', () => {
      // The service should receive 100 RPS, not 50 — wiring an endpoint
      // alongside a service must not dilute the service's share.
      const nodes = [
        node('a', 'browser', { rps: 100 }),
        node('svc', 'service'),
        node('ep', 'endpoint'),
      ];
      const result = computeEffectiveRps(
        nodes,
        [edge('a', 'svc'), edge('a', 'ep')],
      );
      expect(result.get('svc')).toBe(100);
      expect(result.get('ep')).toBe(100);
    });

    it('multiple endpoints each receive the full source rps', () => {
      const nodes = [
        node('a', 'browser', { rps: 60 }),
        node('ep1', 'endpoint'),
        node('ep2', 'endpoint'),
      ];
      const result = computeEffectiveRps(
        nodes,
        [edge('a', 'ep1'), edge('a', 'ep2')],
      );
      expect(result.get('ep1')).toBe(60);
      expect(result.get('ep2')).toBe(60);
    });

    it('endpoint downstream of a service receives the service rps', () => {
      const nodes = [
        node('a', 'browser', { rps: 120 }),
        node('svc', 'service'),
        node('ep', 'endpoint'),
      ];
      const result = computeEffectiveRps(
        nodes,
        [edge('a', 'svc'), edge('svc', 'ep')],
      );
      expect(result.get('svc')).toBe(120);
      expect(result.get('ep')).toBe(120);
    });
  });

  it('cyclic nodes are never fully processed: downstream of the cycle gets nothing', () => {
    // a → b ↔ c (cycle). b receives upstream RPS from a but is stuck in the cycle
    // (its in-degree never reaches 0), so it never propagates to c.
    const nodes = [node('a', 'browser'), node('b', 'service'), node('c', 'service')];
    const result = computeEffectiveRps(
      nodes,
      [edge('a', 'b'), edge('b', 'c'), edge('c', 'b')],
    );
    expect(result.get('a')).toBe(1);
    // b receives the split from a but its in-degree stays > 0 (due to the c→b edge),
    // so it is never processed for outgoing edges.
    expect(result.get('b')).toBe(1);
    // c is never reached because b is never processed.
    expect(result.has('c')).toBe(false);
  });
});
