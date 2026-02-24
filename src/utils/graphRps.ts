export const CLIENT_TYPES    = new Set(['browser', 'ios', 'android', 'tv', 'watch', 'vr']);
/** Nodes that forward their full RPS to every outgoing edge (no splitting). */
export const BROADCAST_TYPES = new Set(['cloudflare', 'cdn', 'dns', 'subdomain', 'firewall', 'apigateway']);

type SlimNode = { id: string; type?: string; data?: Record<string, unknown> };
type SlimEdge = { source: string; target: string };

export function isEmitter(node: SlimNode): boolean {
  const animated = node.data?.animated;
  if (animated === true)  return true;
  if (animated === false) return false;
  return CLIENT_TYPES.has(node.type ?? '');
}

/**
 * Computes the effective RPS for every reachable node using Kahn's topological sort.
 *
 * - Emitter nodes  → their own data.rps (default 1 k-RPS)
 * - Forwarder nodes → sum of effective RPS from all active incoming edges
 *
 * Returns Map<nodeId, effectiveRps> for all nodes reachable from an emitter.
 * Nodes inside cycles are excluded (they never reach in-degree 0).
 */
export function computeEffectiveRps(
  nodes: SlimNode[],
  edges: SlimEdge[],
): Map<string, number> {
  const rpsMap = new Map<string, number>();

  // ── Step 1: BFS to find all reachable nodes ────────────────────────────────
  const nodeIds = new Set(nodes.map((n) => n.id));
  const active = new Set<string>();
  const bfsQueue: string[] = [];
  nodes.forEach((n) => {
    if (isEmitter(n)) { active.add(n.id); bfsQueue.push(n.id); }
  });
  let k = 0;
  while (k < bfsQueue.length) {
    const nid = bfsQueue[k++];
    edges.forEach((e) => {
      // Only follow edges whose target node actually exists — stale edges pointing
      // to deleted nodes would otherwise inflate the active set and the split count.
      if (e.source === nid && !active.has(e.target) && nodeIds.has(e.target)) {
        active.add(e.target); bfsQueue.push(e.target);
      }
    });
  }
  if (active.size === 0) return rpsMap;

  // ── Step 2: Build in-degree + out-targets for the active sub-graph ─────────
  // Emitter nodes always seed with their own RPS regardless of incoming edges.
  // Edges whose target is an emitter are excluded entirely: emitters don't
  // receive upstream RPS, and they don't count toward a source's split factor.
  //
  // Duplicate edges between the same (source, target) pair — e.g. left over
  // from replica handles — are collapsed to one: a node pair counts as a
  // single connection regardless of how many parallel edges exist.
  const inDegree   = new Map<string, number>();
  const outTargets = new Map<string, string[]>();
  active.forEach((id) => { inDegree.set(id, 0); outTargets.set(id, []); });
  const seenPairs = new Set<string>();
  edges.forEach((e) => {
    const pair = `${e.source}::${e.target}`;
    if (seenPairs.has(pair)) return;
    seenPairs.add(pair);
    if (active.has(e.source) && active.has(e.target)) {
      const targetNode = nodes.find((n) => n.id === e.target);
      // Emitter targets own their RPS — don't count in-degree or split to them
      if (targetNode && isEmitter(targetNode)) return;
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
      outTargets.get(e.source)!.push(e.target);
    }
  });

  // ── Step 3: Kahn's topological sort ───────────────────────────────────────
  const topoQueue: string[] = [];
  active.forEach((id) => {
    if ((inDegree.get(id) ?? 0) === 0) {
      topoQueue.push(id);
      const node = nodes.find((n) => n.id === id);
      rpsMap.set(id, (node?.data?.rps as number | undefined) ?? 1);
    }
  });

  let i = 0;
  while (i < topoQueue.length) {
    const nodeId  = topoQueue[i++];
    const nodeRps = rpsMap.get(nodeId) ?? 0;
    const allTargets = outTargets.get(nodeId) ?? [];
    const nodeType   = nodes.find((n) => n.id === nodeId)?.type ?? '';
    const isBroadcast = BROADCAST_TYPES.has(nodeType);

    // Endpoint nodes are "observers": they receive the full upstream RPS without
    // counting toward the split denominator (so wiring an endpoint alongside a
    // service doesn't dilute the service's RPS).
    const regularTargets  = allTargets.filter((t) => nodes.find((n) => n.id === t)?.type !== 'endpoint');
    const endpointTargets = allTargets.filter((t) => nodes.find((n) => n.id === t)?.type === 'endpoint');

    const splitRps = isBroadcast ? nodeRps
      : regularTargets.length > 0 ? nodeRps / regularTargets.length
      : 0;

    regularTargets.forEach((targetId) => {
      rpsMap.set(targetId, (rpsMap.get(targetId) ?? 0) + splitRps);
      const newDeg = (inDegree.get(targetId) ?? 0) - 1;
      inDegree.set(targetId, newDeg);
      if (newDeg === 0) topoQueue.push(targetId);
    });

    // Endpoints always receive the full source RPS, regardless of other targets.
    endpointTargets.forEach((targetId) => {
      rpsMap.set(targetId, (rpsMap.get(targetId) ?? 0) + nodeRps);
      const newDeg = (inDegree.get(targetId) ?? 0) - 1;
      inDegree.set(targetId, newDeg);
      if (newDeg === 0) topoQueue.push(targetId);
    });
  }

  return rpsMap;
}
