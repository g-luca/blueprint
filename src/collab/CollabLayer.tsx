import { useEffect, useState, useCallback, useMemo } from 'react';
import { CollabContext } from './CollabContext';
import { RoomContext } from './RoomContext';
import { useRoom } from './useRoom';
import { useCollabSync } from './useCollabSync';
import { JoinModal } from './components/JoinModal';
import { hashPassword, deriveEncryptionKey } from '../utils/crypto';
import { useFlowStore } from '../store/useFlowStore';
import { getAllFiles } from '../utils/persistence';
import { COLLAB_ENDPOINT } from '../utils/features';

// ── StatusBanner ───────────────────────────────────────────────────────────────
// Fixed bottom-center notification strip used by offline and error gate states.

function StatusBanner({
  message,
  borderColor,
  onRetry,
  onLeave,
}: {
  message: string;
  borderColor: string;
  onRetry: () => void;
  onLeave?: () => void;
}) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(30,30,30,0.95)', border: `1px solid ${borderColor}`,
      borderRadius: 8, padding: '10px 16px', zIndex: 99999,
      display: 'flex', alignItems: 'center', gap: 12,
      color: '#f8fafc', fontSize: 13, boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    }}>
      <span>{message}</span>
      <button
        onClick={onRetry}
        style={{
          background: 'var(--color-selection-ring)', border: 'none', borderRadius: 5,
          padding: '4px 10px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}
      >
        Retry
      </button>
      {onLeave && (
        <button
          onClick={onLeave}
          style={{
            background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)',
            fontSize: 12, cursor: 'pointer', padding: '4px 6px',
          }}
        >
          Leave
        </button>
      )}
    </div>
  );
}

// ── CollabProvider ─────────────────────────────────────────────────────────────
// Thin wrapper that calls useCollabSync and injects values into CollabContext.

function CollabProvider({
  roomId,
  password,
  encryptionKey,
  onAuthError,
  children,
}: {
  roomId: string;
  password?: string;
  encryptionKey?: CryptoKey;
  onAuthError: () => void;
  children: React.ReactNode;
}) {
  const { sendPresence, otherCursors, myClientId, myName, myColor, isConnected } = useCollabSync(roomId, {
    password,
    encryptionKey,
    onAuthError,
  });
  return (
    <CollabContext.Provider value={{ sendPresence, otherCursors, myClientId, myName, myColor, isInRoom: true, isConnected }}>
      {children}
    </CollabContext.Provider>
  );
}

// ── CollabGate ─────────────────────────────────────────────────────────────────
// Checks whether the room needs a password, shows the JoinModal when necessary,
// and only mounts CollabProvider once we have a valid (or absent) password.
// Falls back to cached local state when the server is unreachable.

type GateStatus =
  | { kind: 'checking' }
  | { kind: 'needs-password'; error: boolean }
  | { kind: 'ready'; passwordHash: string | undefined; encryptionKey: CryptoKey | undefined }
  | { kind: 'offline-cached' }
  | { kind: 'fetch-error' };

function CollabGate({
  roomId,
  creatorPasswordHash,
  creatorEncryptionKey,
  onCancel,
  children,
}: {
  roomId: string;
  /** Defined when this client created the room (already validated). */
  creatorPasswordHash: string | undefined;
  creatorEncryptionKey: CryptoKey | undefined;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  const [gate, setGate] = useState<GateStatus>(() =>
    // Creators already have the hash — skip the meta fetch entirely.
    creatorPasswordHash !== undefined
      ? { kind: 'ready', passwordHash: creatorPasswordHash, encryptionKey: creatorEncryptionKey }
      : { kind: 'checking' },
  );
  // Incrementing this re-runs the meta fetch effect without changing roomId.
  const [retryCount, setRetryCount] = useState(0);

  // Meta fetch — only for joiners (creatorPasswordHash === undefined).
  useEffect(() => {
    if (creatorPasswordHash !== undefined) return;

    let cancelled = false;
    fetch(`${COLLAB_ENDPOINT}/collab/${roomId}/meta`)
      .then((r) => {
        if (!r.ok) throw new Error(`meta: ${r.status}`);
        return r.json() as Promise<{ hasPassword: boolean }>;
      })
      .then((meta) => {
        if (cancelled) return;
        setGate(
          meta.hasPassword
            ? { kind: 'needs-password', error: false }
            : { kind: 'ready', passwordHash: undefined, encryptionKey: undefined },
        );
      })
      .catch(() => {
        if (cancelled) return;
        // Server unreachable — try to load from cache so the user isn't stuck.
        const cached = getAllFiles().find((f) => f.roomId === roomId);
        if (cached) {
          useFlowStore.setState({ nodes: cached.nodes, edges: cached.edges });
          setGate({ kind: 'offline-cached' });
        } else {
          setGate({ kind: 'fetch-error' });
        }
      });

    return () => { cancelled = true; };
  }, [roomId, creatorPasswordHash, retryCount]);

  const onJoin = useCallback(async (rawPassword: string) => {
    try {
      const [hash, key] = await Promise.all([
        hashPassword(rawPassword),
        deriveEncryptionKey(rawPassword, roomId),
      ]);
      setGate({ kind: 'ready', passwordHash: hash, encryptionKey: key });
    } catch {
      // Web Crypto unavailable or key derivation failed — re-show the modal with an error indicator.
      setGate({ kind: 'needs-password', error: true });
    }
  }, [roomId]);

  const onAuthError = useCallback(() => {
    setGate({ kind: 'needs-password', error: true });
  }, []);

  const retryFetch = useCallback(() => {
    setGate({ kind: 'checking' });
    setRetryCount((n) => n + 1);
  }, []);

  // While checking (meta fetch in progress) render the layout in solo mode
  // so the UI is immediately usable — the collab layer connects in the background.
  if (gate.kind === 'checking') {
    return <>{children}</>;
  }

  if (gate.kind === 'offline-cached') {
    return (
      <>
        {children}
        <StatusBanner
          message="Offline — showing cached version."
          borderColor="rgba(251,191,36,0.5)"
          onRetry={retryFetch}
        />
      </>
    );
  }

  if (gate.kind === 'fetch-error') {
    return (
      <>
        {children}
        <StatusBanner
          message="Could not reach the room server."
          borderColor="rgba(248,113,113,0.5)"
          onRetry={retryFetch}
          onLeave={onCancel}
        />
      </>
    );
  }

  if (gate.kind === 'needs-password') {
    return (
      <>
        {children}
        <JoinModal error={gate.error} onJoin={onJoin} onCancel={onCancel} />
      </>
    );
  }

  // gate.kind === 'ready'
  return (
    <CollabProvider
      roomId={roomId}
      password={gate.passwordHash}
      encryptionKey={gate.encryptionKey}
      onAuthError={onAuthError}
    >
      {children}
    </CollabProvider>
  );
}

// ── RoomAutoSave ───────────────────────────────────────────────────────────────
// Mounts while in a room. Debounces canvas saves to localStorage so the room
// always appears in the recent files list with up-to-date state.

function RoomAutoSave({ roomId, roomName }: { roomId: string; roomName: string }) {
  const saveRoomSnapshot = useFlowStore((s) => s.saveRoomSnapshot);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);

  // Debounced save — fires 2 s after mount and after every canvas change.
  // Deliberately not saving immediately on mount: joiners receive the server
  // snapshot via WebSocket (typically < 500 ms), so an instant save would
  // capture the pre-sync local canvas and write stale data to localStorage.
  // The 2 s debounce gives the snapshot time to arrive; if nodes/edges change
  // when the snapshot is applied the timer resets, ensuring the saved copy is
  // always the post-sync state.
  useEffect(() => {
    const timer = setTimeout(() => saveRoomSnapshot(roomId, roomName), 2000);
    return () => clearTimeout(timer);
  }, [nodes, edges, roomId, roomName, saveRoomSnapshot]);

  return null;
}

// ── CollabLayer ────────────────────────────────────────────────────────────────
// Single wrapper that provides RoomContext and conditionally wraps children
// with the collab gate + provider. Import this in App.tsx.

export function CollabLayer({ children }: { children: React.ReactNode }) {
  const roomState = useRoom();
  const { roomId, isInRoom, passwordHash, encryptionKey, roomName, leaveRoom } = roomState;

  // Effective name for the room snapshot: creator-supplied, or looked up from a
  // previous visit, or a short ID-based default for first-time joiners.
  const effectiveRoomName = useMemo(() => {
    if (!roomId) return null;
    if (roomName) return roomName;
    const saved = getAllFiles().find((f) => f.roomId === roomId);
    return saved?.name ?? `Room ${roomId.slice(0, 5)}`;
  }, [roomId, roomName]);

  return (
    <RoomContext.Provider value={roomState}>
      {isInRoom && roomId ? (
        <>
          <RoomAutoSave roomId={roomId} roomName={effectiveRoomName!} />
          <CollabGate roomId={roomId} creatorPasswordHash={passwordHash} creatorEncryptionKey={encryptionKey} onCancel={leaveRoom}>
            {children}
          </CollabGate>
        </>
      ) : (
        children
      )}
    </RoomContext.Provider>
  );
}
