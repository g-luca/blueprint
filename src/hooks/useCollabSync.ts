import { useEffect, useRef, useCallback, useState } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import type { AppNode } from '../types/nodes';
import type { AppEdge } from '../types/edges';
import type { CollabMessage } from '../../worker/types';
import type { CursorInfo } from '../context/CollabContext';

/** State broadcast throttle — ~30fps. */
const STATE_THROTTLE_MS = 33;
/** Cursor presence throttle — 20fps to save bandwidth. */
const PRESENCE_THROTTLE_MS = 50;
/** Reconnect backoff: start at 1 s, double each attempt, cap at 30 s. */
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS  = 30_000;

function getWsUrl(roomId: string, passwordHash?: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const base = `${protocol}//${window.location.host}/collab/${roomId}`;
  return passwordHash ? `${base}?pwd=${encodeURIComponent(passwordHash)}` : base;
}

function getProbeUrl(roomId: string, passwordHash?: string): string {
  const base = `/collab/${roomId}`;
  return passwordHash ? `${base}?pwd=${encodeURIComponent(passwordHash)}` : base;
}

interface CollabSyncOptions {
  password?: string;
  onAuthError?: () => void;
}

export function useCollabSync(roomId: string, options: CollabSyncOptions = {}) {
  const { password, onAuthError } = options;

  const wsRef = useRef<WebSocket | null>(null);
  /** Guards against echoing remote state updates back to the server. */
  const isApplyingRemote = useRef(false);
  const myClientIdRef = useRef<string | null>(null);
  const myColorRef = useRef<string>('#60a5fa');
  const myNameRef = useRef<string>('User');
  const stateThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPresenceRef = useRef<number>(0);

  const [myClientId, setMyClientId] = useState<string | null>(null);
  const [myName, setMyName]   = useState('');
  const [myColor, setMyColor] = useState('#60a5fa');
  const [otherCursors, setOtherCursors] = useState<Map<string, CursorInfo>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  // Incrementing this triggers a reconnect attempt via the effect dependency.
  const [reconnectTick, setReconnectTick] = useState(0);
  const retryDelayRef = useRef(RECONNECT_BASE_MS);

  useEffect(() => {
    // Pending flush: tracks whether there's unsent state when the effect cleans up.
    let cancelled = false;
    let hasPendingState = false;
    let cleanupWs: WebSocket | null = null;
    let unsubStore: (() => void) | null = null;

    (async () => {
      // ── Password probe ────────────────────────────────────────────────────
      // Always probe (even for no-password rooms) for two reasons:
      // 1. Validates the password and surfaces 403 before the WS upgrade.
      // 2. Guarantees an `await` before `new WebSocket()` so React StrictMode's
      //    synchronous cleanup (cancelled = true) fires before the socket opens,
      //    preventing a phantom first connection that would make the real one
      //    appear as "User 2" in the Durable Object's connection count.
      try {
        const resp = await fetch(getProbeUrl(roomId, password));
        if (cancelled) return;
        if (resp.status === 403) {
          onAuthError?.();
          return;
        }
      } catch {
        if (cancelled) return;
        // Network error — let the WS connection attempt also fail naturally
      }

      // ── Open WebSocket ────────────────────────────────────────────────────
      // Reset the client ID before each connection attempt so that onerror
      // can correctly detect auth failures even after a prior successful session.
      myClientIdRef.current = null;
      const ws = new WebSocket(getWsUrl(roomId, password));
      wsRef.current = ws;
      cleanupWs = ws;

      // Track whether the close was due to an auth failure so we don't
      // attempt to reconnect in that case (it would just fail again).
      let wasAuthError = false;

      ws.onerror = () => {
        // If we haven't received a welcome yet, treat this as an auth/connect error
        if (!myClientIdRef.current) {
          wasAuthError = true;
          onAuthError?.();
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        setIsConnected(false);
        setOtherCursors(new Map());

        // Schedule a reconnect unless the close was intentional (cleanup) or auth-related.
        if (!cancelled && !wasAuthError) {
          const delay = retryDelayRef.current;
          retryDelayRef.current = Math.min(delay * 2, RECONNECT_MAX_MS);
          setTimeout(() => {
            // Re-check cancelled in case the effect was torn down while the
            // timer was pending (e.g. the user left the room).
            if (!cancelled) setReconnectTick((t) => t + 1);
          }, delay);
        }
      };

      ws.onmessage = (event: MessageEvent<string>) => {
        let msg: CollabMessage;
        try {
          msg = JSON.parse(event.data) as CollabMessage;
        } catch {
          return; // ignore malformed frame
        }
        const store = useFlowStore.getState();

        if (msg.type === 'welcome') {
          myClientIdRef.current = msg.clientId;
          myColorRef.current = msg.color;
          myNameRef.current = msg.name;
          setMyClientId(msg.clientId);
          setMyColor(msg.color);
          setMyName(msg.name);
          // Successful connection — reset the backoff for the next potential disconnect.
          setIsConnected(true);
          retryDelayRef.current = RECONNECT_BASE_MS;

          const { nodes, edges } = msg.snapshot;
          if (nodes.length === 0 && edges.length === 0) {
            // Only the creator seeds the room, and only if they have something to contribute.
            // This prevents a concurrent joiner with an empty canvas from overwriting the creator.
            if (msg.isCreator) {
              const { nodes: ourNodes, edges: ourEdges } = store;
              if (ourNodes.length > 0 || ourEdges.length > 0) {
                ws.send(JSON.stringify({
                  type: 'state_update',
                  senderId: msg.clientId,
                  nodes: ourNodes as Record<string, unknown>[],
                  edges: ourEdges as Record<string, unknown>[],
                } satisfies CollabMessage));
              }
            }
            // Non-creators with empty snapshot just start with an empty canvas.
          } else {
            // Late joiner — populate canvas from room snapshot.
            isApplyingRemote.current = true;
            store.setNodes(nodes as AppNode[]);
            store.setEdges(edges as AppEdge[]);
            isApplyingRemote.current = false;
          }
        } else if (msg.type === 'state_update') {
          isApplyingRemote.current = true;
          store.setNodes(msg.nodes as AppNode[]);
          store.setEdges(msg.edges as AppEdge[]);
          isApplyingRemote.current = false;
        } else if (msg.type === 'presence') {
          setOtherCursors((prev) => {
            const next = new Map(prev);
            next.set(msg.senderId, { cursor: msg.cursor, color: msg.color, name: msg.name });
            return next;
          });
        } else if (msg.type === 'client_left') {
          setOtherCursors((prev) => {
            const next = new Map(prev);
            next.delete(msg.clientId);
            return next;
          });
        }
      };

      // ── Subscribe to Zustand and broadcast changes ─────────────────────
      unsubStore = useFlowStore.subscribe((state, prev) => {
        if (isApplyingRemote.current) return;
        if (state.nodes === prev.nodes && state.edges === prev.edges) return;

        // Skip selection-only node changes — no need to broadcast who has what selected.
        if (state.edges === prev.edges && state.nodes.length === prev.nodes.length) {
          const allMatch = state.nodes.every((n, i) => {
            // Guard: length is checked above but prev[i] could still be absent if arrays differ
            const pn = prev.nodes[i];
            if (!pn || n.id !== pn.id) return false;
            if (n === pn) return true;
            // Different object — check if only `.selected` changed
            return (
              n.position === pn.position &&
              n.data    === pn.data    &&
              n.type    === pn.type    &&
              n.width   === pn.width   &&
              n.height  === pn.height
            );
          });
          if (allMatch) return;
        }

        hasPendingState = true;
        if (stateThrottleRef.current) return;

        stateThrottleRef.current = setTimeout(() => {
          stateThrottleRef.current = null;
          hasPendingState = false;
          const { nodes, edges } = useFlowStore.getState();
          const currentWs = wsRef.current;
          const clientId = myClientIdRef.current;
          if (currentWs?.readyState === WebSocket.OPEN && clientId) {
            currentWs.send(JSON.stringify({
              type: 'state_update',
              senderId: clientId,
              nodes: nodes as Record<string, unknown>[],
              edges: edges as Record<string, unknown>[],
            } satisfies CollabMessage));
          }
        }, STATE_THROTTLE_MS);
      });
    })();

    return () => {
      cancelled = true;
      unsubStore?.();

      // Flush any pending state broadcast before closing so the last edit isn't lost.
      if (hasPendingState && stateThrottleRef.current) {
        clearTimeout(stateThrottleRef.current);
        stateThrottleRef.current = null;
        const { nodes, edges } = useFlowStore.getState();
        const currentWs = wsRef.current;
        const clientId = myClientIdRef.current;
        if (currentWs?.readyState === WebSocket.OPEN && clientId) {
          currentWs.send(JSON.stringify({
            type: 'state_update',
            senderId: clientId,
            nodes: nodes as Record<string, unknown>[],
            edges: edges as Record<string, unknown>[],
          } satisfies CollabMessage));
        }
      } else if (stateThrottleRef.current) {
        clearTimeout(stateThrottleRef.current);
        stateThrottleRef.current = null;
      }

      cleanupWs?.close();
      wsRef.current = null;
    };
  // reconnectTick is intentionally included: incrementing it triggers a fresh connection attempt.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, password, onAuthError, reconnectTick]);

  const sendPresence = useCallback((cursor: { x: number; y: number } | null) => {
    const ws = wsRef.current;
    const clientId = myClientIdRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !clientId) return;

    // Throttle to ~20fps; always send null (cursor left) immediately.
    const now = Date.now();
    if (cursor !== null && now - lastPresenceRef.current < PRESENCE_THROTTLE_MS) return;
    lastPresenceRef.current = now;

    ws.send(JSON.stringify({
      type: 'presence',
      senderId: clientId,
      cursor,
      color: myColorRef.current,
      name: myNameRef.current,
    } satisfies CollabMessage));
  }, []);

  return { sendPresence, otherCursors, myClientId, myName, myColor, isConnected };
}
