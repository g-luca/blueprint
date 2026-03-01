import { useState, useRef, useCallback } from 'react';
import { useRoomContext } from '../RoomContext';
import { useCollab } from '../CollabContext';

export function ShareButton() {
  const { roomId, isInRoom, createRoom, leaveRoom, copyLink, copied } = useRoomContext();
  const { otherCursors, myName, myColor, isConnected } = useCollab();

  // Panel visibility
  const [showPanel, setShowPanel] = useState(false);
  // "Create room" pre-panel (shown before room is active)
  const [showCreate, setShowCreate] = useState(false);
  const [roomNameInput, setRoomNameInput] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    setCreateError(null);
    try {
      await createRoom(password.trim() || undefined, roomNameInput.trim() || undefined);
      setShowCreate(false);
      setShowPanel(true);
      setPassword('');
      setRoomNameInput('');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setCreating(false);
    }
  }, [createRoom, password, roomNameInput]);

  const handleLeave = useCallback(() => {
    leaveRoom();
    setShowPanel(false);
    setShowCreate(false);
  }, [leaveRoom]);

  const roomUrl = roomId
    ? `${window.location.origin}${window.location.pathname}#room/${roomId}`
    : '';

  const collaboratorCount = otherCursors.size; // excludes self

  // ── Not in room ────────────────────────────────────────────────────────────
  if (!isInRoom) {
    return (
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowCreate((v) => !v)}
          style={primaryBtnStyle}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Share
        </button>

        {showCreate && (
          <>
            {/* Click-away backdrop */}
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 9997 }}
              onClick={() => { setShowCreate(false); setPassword(''); setRoomNameInput(''); }}
            />
            <div
              ref={panelRef}
              onMouseDown={(e) => e.stopPropagation()}
              style={panelStyle}
            >
              <p style={panelTitle}>Create a shared room</p>
              <p style={panelSubtitle}>
                Anyone with the link can view and edit the canvas in real time.
              </p>

              <label style={labelStyle}>Room name (optional)</label>
              <input
                type="text"
                value={roomNameInput}
                onChange={(e) => setRoomNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
                placeholder="My Architecture"
                style={inputStyle}
              />

              <label style={labelStyle}>Password (optional)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
                placeholder="Leave blank for no password"
                autoComplete="new-password"
                style={inputStyle}
              />

              {createError && (
                <p style={{ margin: '-6px 0 10px', fontSize: 11, color: '#f87171' }}>
                  {createError}
                </p>
              )}

              <button
                onClick={() => void handleCreate()}
                disabled={creating}
                style={{
                  ...primaryBtnStyle,
                  width: '100%',
                  justifyContent: 'center',
                  padding: '7px 0',
                  opacity: creating ? 0.6 : 1,
                  cursor: creating ? 'default' : 'pointer',
                }}
              >
                {creating ? 'Creating…' : 'Create room'}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── In room ────────────────────────────────────────────────────────────────
  const label = !isConnected
    ? 'Reconnecting…'
    : collaboratorCount > 0
      ? `${collaboratorCount + 1} online`
      : 'Shared';

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setShowPanel((v) => !v)} style={primaryBtnStyle}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        {label}
      </button>

      {showPanel && (
        <>
          {/* Click-away backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9997 }}
            onClick={() => setShowPanel(false)}
          />
          <div
            ref={panelRef}
            onMouseDown={(e) => e.stopPropagation()}
            style={panelStyle}
          >
            <p style={panelTitle}>Room link</p>
            <p style={panelSubtitle}>
              Share this link to invite others. The room is live — changes sync in real time.
            </p>

            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              <input
                readOnly
                value={roomUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                style={{ ...inputStyle, marginBottom: 0, cursor: 'text' }}
              />
              <button
                onClick={() => void copyLink()}
                style={{
                  padding: '6px 10px',
                  background: copied ? '#4ade80' : 'var(--color-selection-ring)',
                  border: 'none', borderRadius: 6,
                  cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#fff',
                  flexShrink: 0, transition: 'background 0.2s',
                }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Connected users */}
            <div style={{
              borderTop: '1px solid var(--color-node-border)',
              paddingTop: 12,
              marginBottom: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              {/* Self */}
              {myName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: myColor, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 12, color: 'var(--color-toolbar-text)', flex: 1 }}>
                    {myName}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: 'var(--color-toolbar-text)', opacity: 0.4,
                  }}>
                    you
                  </span>
                </div>
              )}
              {/* Others */}
              {Array.from(otherCursors.entries()).map(([clientId, info]) => (
                <div key={clientId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: info.color, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 12, color: 'var(--color-toolbar-text)' }}>
                    {info.name}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={handleLeave}
              style={{
                width: '100%', padding: '6px 0',
                background: 'transparent',
                border: '1px solid rgba(248,113,113,0.45)',
                borderRadius: 6, cursor: 'pointer',
                fontSize: 11, fontWeight: 600, color: '#f87171',
              }}
            >
              Leave room
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const primaryBtnStyle: React.CSSProperties = {
  height: 26,
  padding: '0 12px',
  background: 'var(--color-selection-ring)',
  border: 'none', borderRadius: 5,
  cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#fff',
  display: 'flex', alignItems: 'center', gap: 6,
};

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  right: 0,
  background: 'var(--color-toolbar-bg)',
  border: '1px solid var(--color-node-border)',
  borderRadius: 10,
  boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
  padding: '16px 18px',
  width: 296,
  zIndex: 9998,
};

const panelTitle: React.CSSProperties = {
  margin: '0 0 6px',
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--color-toolbar-text)',
};

const panelSubtitle: React.CSSProperties = {
  margin: '0 0 14px',
  fontSize: 11,
  opacity: 0.6,
  color: 'var(--color-toolbar-text)',
  lineHeight: 1.5,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--color-toolbar-text)',
  opacity: 0.7,
  marginBottom: 5,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(128,128,128,0.08)',
  border: '1px solid var(--color-node-border)',
  borderRadius: 6,
  padding: '6px 8px',
  color: 'var(--color-toolbar-text)',
  fontSize: 12,
  outline: 'none',
  marginBottom: 12,
};
