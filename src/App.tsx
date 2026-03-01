import { useEffect, useState, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useThemeStore } from './store/useThemeStore';
import { THEMES } from './themes';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Toolbar } from './components/Toolbar/Toolbar';
import { Canvas } from './components/Canvas/Canvas';
import { Toast } from './components/Toast';
import { useRoom } from './hooks/useRoom';
import { useCollabSync } from './hooks/useCollabSync';
import { CollabContext } from './context/CollabContext';
import { RoomContext } from './context/RoomContext';
import { JoinModal } from './components/Collab/JoinModal';
import { hashPassword } from './utils/crypto';
import { useFlowStore } from './store/useFlowStore';
import { getAllFiles } from './utils/persistence';

// ── CollabProvider ─────────────────────────────────────────────────────────────
// Thin wrapper that calls useCollabSync and injects values into CollabContext.

function CollabProvider({
  roomId,
  password,
  onAuthError,
  children,
}: {
  roomId: string;
  password?: string;
  onAuthError: () => void;
  children: React.ReactNode;
}) {
  const { sendPresence, otherCursors, myClientId, myName, myColor, isConnected } = useCollabSync(roomId, {
    password,
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

type GateStatus =
  | { kind: 'checking' }
  | { kind: 'needs-password'; error: boolean }
  | { kind: 'ready'; passwordHash: string | undefined }
  | { kind: 'fetch-error' };

function CollabGate({
  roomId,
  creatorPasswordHash,
  onCancel,
  children,
}: {
  roomId: string;
  /** Defined when this client created the room (already validated). */
  creatorPasswordHash: string | undefined;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  const [gate, setGate] = useState<GateStatus>(() =>
    // Creators already have the hash — skip the meta fetch entirely.
    creatorPasswordHash !== undefined
      ? { kind: 'ready', passwordHash: creatorPasswordHash }
      : { kind: 'checking' },
  );
  // Incrementing this re-runs the meta fetch effect without changing roomId.
  const [retryCount, setRetryCount] = useState(0);

  // Meta fetch — only for joiners (creatorPasswordHash === undefined).
  useEffect(() => {
    if (creatorPasswordHash !== undefined) return;

    let cancelled = false;
    fetch(`/collab/${roomId}/meta`)
      .then((r) => r.json() as Promise<{ hasPassword: boolean }>)
      .then((meta) => {
        if (cancelled) return;
        setGate(
          meta.hasPassword
            ? { kind: 'needs-password', error: false }
            : { kind: 'ready', passwordHash: undefined },
        );
      })
      .catch(() => {
        if (!cancelled) setGate({ kind: 'fetch-error' });
      });

    return () => { cancelled = true; };
  }, [roomId, creatorPasswordHash, retryCount]);

  const onJoin = useCallback(async (rawPassword: string) => {
    const hash = await hashPassword(rawPassword);
    setGate({ kind: 'ready', passwordHash: hash });
  }, []);

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

  if (gate.kind === 'fetch-error') {
    return (
      <>
        {children}
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(30,30,30,0.95)', border: '1px solid rgba(248,113,113,0.5)',
          borderRadius: 8, padding: '10px 16px', zIndex: 99999,
          display: 'flex', alignItems: 'center', gap: 12,
          color: '#f8fafc', fontSize: 13, boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          <span>Could not reach the room server.</span>
          <button
            onClick={retryFetch}
            style={{
              background: 'var(--color-selection-ring)', border: 'none', borderRadius: 5,
              padding: '4px 10px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Retry
          </button>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)',
              fontSize: 12, cursor: 'pointer', padding: '4px 6px',
            }}
          >
            Leave
          </button>
        </div>
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

// ── AppInner ───────────────────────────────────────────────────────────────────

function AppInner() {
  const theme = useThemeStore((s) => s.theme);
  const roomState = useRoom();
  const { roomId, isInRoom, passwordHash, roomName, leaveRoom } = roomState;

  // Inject CSS custom properties on <html> on every theme change.
  useEffect(() => {
    const tokens = THEMES[theme];
    Object.entries(tokens).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--${key}`, value);
    });
  }, [theme]);

  const layout = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
      }}
    >
      <Toolbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <Canvas />
      </div>
      <Toast />
    </div>
  );

  // Effective name for the room snapshot: creator-supplied, or looked up from a
  // previous visit, or a short ID-based default for first-time joiners.
  const effectiveRoomName = (() => {
    if (!roomId) return null;
    if (roomName) return roomName;
    const saved = getAllFiles().find((f) => f.roomId === roomId);
    return saved?.name ?? `Room ${roomId.slice(0, 5)}`;
  })();

  return (
    <RoomContext.Provider value={roomState}>
      {isInRoom && roomId ? (
        <>
          <RoomAutoSave roomId={roomId} roomName={effectiveRoomName!} />
          <CollabGate roomId={roomId} creatorPasswordHash={passwordHash} onCancel={leaveRoom}>
            {layout}
          </CollabGate>
        </>
      ) : (
        layout
      )}
    </RoomContext.Provider>
  );
}

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  );
}
