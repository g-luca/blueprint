export const CLIENT_TYPES = new Set(['browser', 'ios', 'android', 'tv', 'watch', 'vr']);

type SlimNode = { id: string; type?: string; data?: Record<string, unknown> };
type SlimEdge = { source: string; target: string };

export function isEmitter(node: SlimNode): boolean {
  const animated = node.data?.animated;
  if (animated === true)  return true;
  if (animated === false) return false;
  return CLIENT_TYPES.has(node.type ?? '');
}

/**
 * Computes the effective TPS for every reachable node using Kahn's topological sort.
 *
 * - Emitter nodes  → their own data.tps (default 1 k-TPS)
 * - Forwarder nodes → sum of effective TPS from all active incoming edges
 *
 * Returns Map<nodeId, effectiveTps> for all nodes reachable from an emitter.
 * Nodes inside cycles are excluded (they never reach in-degree 0).
 */
export function computeEffectiveTps(
  nodes: SlimNode[],
  edges: SlimEdge[],
): Map<string, number> {
  const tpsMap = new Map<string, number>();

  // ── Step 1: BFS to find all reachable nodes ────────────────────────────────
  const active = new Set<string>();
  const bfsQueue: string[] = [];
  nodes.forEach((n) => {
    if (isEmitter(n)) { active.add(n.id); bfsQueue.push(n.id); }
  });
  let k = 0;
  while (k < bfsQueue.length) {
    const nid = bfsQueue[k++];
    edges.forEach((e) => {
      if (e.source === nid && !active.has(e.target)) {
        active.add(e.target); bfsQueue.push(e.target);
      }
    });
  }
  if (active.size === 0) return tpsMap;

  // ── Step 2: Build in-degree + out-targets for the active sub-graph ─────────
  // Nodes with data.animated === true are explicit emitters: treat them as
  // roots regardless of incoming edges (their own tps overrides upstream sum).
  const inDegree  = new Map<string, number>();
  const outTargets = new Map<string, string[]>();
  active.forEach((id) => { inDegree.set(id, 0); outTargets.set(id, []); });
  edges.forEach((e) => {
    if (active.has(e.source) && active.has(e.target)) {
      const targetNode = nodes.find((n) => n.id === e.target);
      // Skip in-degree count for explicit emitters so they're seeded with their own TPS
      if (targetNode?.data?.animated !== true) {
        inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
      }
      outTargets.get(e.source)!.push(e.target);
    }
  });

  // ── Step 3: Kahn's topological sort ───────────────────────────────────────
  const topoQueue: string[] = [];
  active.forEach((id) => {
    if ((inDegree.get(id) ?? 0) === 0) {
      topoQueue.push(id);
      const node = nodes.find((n) => n.id === id);
      tpsMap.set(id, (node?.data?.tps as number | undefined) ?? 1);
    }
  });

  let i = 0;
  while (i < topoQueue.length) {
    const nodeId  = topoQueue[i++];
    const nodeTps = tpsMap.get(nodeId) ?? 0;
    const targets = outTargets.get(nodeId) ?? [];
    // Distribute TPS equally across all outgoing edges (load-balancer semantics)
    const splitTps = targets.length > 0 ? nodeTps / targets.length : 0;
    targets.forEach((targetId) => {
      tpsMap.set(targetId, (tpsMap.get(targetId) ?? 0) + splitTps);
      const newDeg = (inDegree.get(targetId) ?? 0) - 1;
      inDegree.set(targetId, newDeg);
      if (newDeg === 0) topoQueue.push(targetId);
    });
  }

  return tpsMap;
}
