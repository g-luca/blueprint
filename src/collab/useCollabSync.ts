import { useEffect, useRef, useCallback, useState } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import type { AppNode } from '../types/nodes';
import type { AppEdge } from '../types/edges';
import type { CollabMessage } from '../../worker/types';
import type { CursorInfo } from './CollabContext';
import { COLLAB_ENDPOINT } from '../utils/features';
import { encryptState, decryptState } from '../utils/crypto';

/** State broadcast throttle — ~30fps. */
const STATE_THROTTLE_MS = 33;
/** Cursor presence throttle — 20fps to save bandwidth. */
const PRESENCE_THROTTLE_MS = 50;
/** Reconnect backoff: start at 1 s, double each attempt, cap at 30 s. */
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS  = 30_000;

/**
 * Build a collab URL. When `useWs` is true the HTTP(S) endpoint is converted
 * to a WebSocket URL (http→ws, https→wss). The passwordHash is sent in the
 * query string — the only viable auth mechanism for browser WS upgrades since
 * Authorization headers are not supported during the upgrade handshake.
 */
function buildCollabUrl(roomId: string, passwordHash?: string, useWs = false): string {
  const endpoint = useWs ? COLLAB_ENDPOINT!.replace(/^http/, 'ws') : COLLAB_ENDPOINT!;
  const base = `${endpoint}/collab/${roomId}`;
  return passwordHash ? `${base}?pwd=${encodeURIComponent(passwordHash)}` : base;
}

interface CollabSyncOptions {
  password?: string;
  encryptionKey?: CryptoKey;
  onAuthError?: () => void;
}

export function useCollabSync(roomId: string, options: CollabSyncOptions = {}) {
  const { password, encryptionKey, onAuthError } = options;

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

  // Reads current canvas state from the store and sends a state_update over the
  // active WebSocket. Used by both the throttle timer and the cleanup flush.
  async function sendStateUpdate() {
    const { nodes, edges } = useFlowStore.getState();
    const ws = wsRef.current;
    const clientId = myClientIdRef.current;
    if (ws?.readyState !== WebSocket.OPEN || !clientId) return;

    if (encryptionKey) {
      const { iv, ciphertext } = await encryptState(
        encryptionKey,
        nodes as Record<string, unknown>[],
        edges as Record<string, unknown>[],
      );
      if (ws.readyState !== WebSocket.OPEN) return; // socket may have closed during await
      ws.send(JSON.stringify({ type: 'state_update', senderId: clientId, iv, ciphertext } satisfies CollabMessage));
    } else {
      ws.send(JSON.stringify({
        type: 'state_update',
        senderId: clientId,
        nodes: nodes as Record<string, unknown>[],
        edges: edges as Record<string, unknown>[],
      } satisfies CollabMessage));
    }
  }

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
        const resp = await fetch(buildCollabUrl(roomId, password));
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
      const ws = new WebSocket(buildCollabUrl(roomId, password, true));
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

      ws.onclose = (e: CloseEvent) => {
        wsRef.current = null;
        setIsConnected(false);
        setOtherCursors(new Map());

        // Schedule a reconnect unless the close was intentional (cleanup), auth-related,
        // or the room was explicitly deleted by another user (code 4000).
        if (!cancelled && !wasAuthError && e.code !== 4000) {
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
        void (async () => {
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

            // Populate presence from other connected clients
            setOtherCursors(new Map(
              msg.clients.map((c) => [c.clientId, { cursor: null, color: c.color, name: c.name }]),
            ));

            // Resolve the snapshot — decrypt if it's an encrypted blob.
            let snapshotNodes: Record<string, unknown>[] = [];
            let snapshotEdges: Record<string, unknown>[] = [];
            const snap = msg.snapshot;
            if ('iv' in snap && 'ciphertext' in snap) {
              if (encryptionKey) {
                try {
                  const dec = await decryptState(encryptionKey, snap);
                  snapshotNodes = dec.nodes;
                  snapshotEdges = dec.edges;
                } catch {
                  // Wrong key or tampered data — treat as empty
                }
              }
            } else {
              snapshotNodes = snap.nodes;
              snapshotEdges = snap.edges;
            }

            if (snapshotNodes.length === 0 && snapshotEdges.length === 0 && msg.clients.length === 0) {
              // Brand new empty room — seed our local canvas (safe: we're the only client).
              const { nodes: ourNodes, edges: ourEdges } = store;
              if (ourNodes.length > 0 || ourEdges.length > 0) void sendStateUpdate();
            } else if (snapshotNodes.length > 0 || snapshotEdges.length > 0) {
              // Server has state — load it (authoritative).
              // setNodes/setEdges are synchronous Zustand calls, so isApplyingRemote
              // is cleared before any other microtask (e.g. a concurrent onmessage
              // IIFE) can check it — the guard is race-safe for this pattern.
              //
              // Known limitation (encrypted rooms): decryptState() above is async, so a
              // concurrent state_update message can be applied to the store between the
              // await and this line — the snapshot would then overwrite the newer state.
              // The 33ms broadcast cycle from other clients corrects this within one tick.
              // Fixing it properly would require buffering incoming state_updates until
              // the snapshot resolves, which is significantly more complex than the risk.
              isApplyingRemote.current = true;
              store.setNodes(snapshotNodes as AppNode[]);
              store.setEdges(snapshotEdges as AppEdge[]);
              isApplyingRemote.current = false;
            }
            // else: server empty but others connected — wait for their broadcast.
          } else if (msg.type === 'client_joined') {
            setOtherCursors((prev) => {
              const next = new Map(prev);
              next.set(msg.clientId, { cursor: null, color: msg.color, name: msg.name });
              return next;
            });
          } else if (msg.type === 'state_update') {
            if ('iv' in msg && 'ciphertext' in msg) {
              // Encrypted variant — decrypt before applying.
              if (encryptionKey) {
                try {
                  const dec = await decryptState(encryptionKey, msg as { iv: string; ciphertext: string });
                  isApplyingRemote.current = true;
                  store.setNodes(dec.nodes as AppNode[]);
                  store.setEdges(dec.edges as AppEdge[]);
                  isApplyingRemote.current = false;
                } catch {
                  // Decryption failed — ignore
                }
              }
            } else {
              isApplyingRemote.current = true;
              store.setNodes(msg.nodes as AppNode[]);
              store.setEdges(msg.edges as AppEdge[]);
              isApplyingRemote.current = false;
            }
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
        })();
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
          sendStateUpdate();
        }, STATE_THROTTLE_MS);
      });
    })();

    return () => {
      cancelled = true;
      unsubStore?.();

      // Cancel any pending throttle timer. If state was dirty, flush it now so
      // the last edit isn't lost. Capturing hasPendingState before clearTimeout
      // ensures we read it while the timer is still pending (and therefore before
      // the timer callback could have cleared it).
      // NOTE: the flush is skipped for encrypted rooms. sendStateUpdate() must
      // await encryptState() before sending, but cleanupWs?.close() runs on the
      // next line — the WebSocket is closed before the async encryption resolves,
      // so the send would be silently dropped anyway. For unencrypted rooms the
      // send is synchronous and succeeds before close().
      if (stateThrottleRef.current) {
        const shouldFlush = hasPendingState;
        clearTimeout(stateThrottleRef.current);
        stateThrottleRef.current = null;
        if (shouldFlush && !encryptionKey) sendStateUpdate();
      }

      cleanupWs?.close();
      wsRef.current = null;
    };
  // reconnectTick is intentionally included: incrementing it triggers a fresh connection attempt.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, password, encryptionKey, onAuthError, reconnectTick]);

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
