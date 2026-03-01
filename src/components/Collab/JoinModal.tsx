import { useState, useRef, useEffect } from 'react';

interface JoinModalProps {
  onJoin: (password: string) => void;
  onCancel: () => void;
  /** Show "Wrong password" error message. */
  error: boolean;
}

export function JoinModal({ onJoin, onCancel, error }: JoinModalProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus the input when the modal mounts or when an error resets it
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [error]);

  // Dismiss on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onJoin(trimmed);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--color-toolbar-bg)',
          border: '1px solid var(--color-node-border)',
          borderRadius: 12,
          boxShadow: '0 16px 48px rgba(0,0,0,0.28)',
          padding: '24px 28px',
          width: 340,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Lock icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-toolbar-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-toolbar-text)' }}>
            Password required
          </span>
        </div>

        <p style={{ margin: '0 0 14px', fontSize: 12, opacity: 0.6, color: 'var(--color-toolbar-text)' }}>
          This room is password-protected. Enter the password to join.
        </p>

        <input
          ref={inputRef}
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder="Room password"
          autoComplete="off"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(128,128,128,0.08)',
            border: `1px solid ${error ? '#f87171' : 'var(--color-node-border)'}`,
            borderRadius: 6, padding: '8px 10px',
            color: 'var(--color-toolbar-text)', fontSize: 13, outline: 'none',
            marginBottom: error ? 6 : 16,
          }}
        />

        {error && (
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#f87171' }}>
            Wrong password. Please try again.
          </p>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '8px 0',
              background: 'transparent',
              border: '1px solid var(--color-node-border)',
              borderRadius: 6, cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              color: 'var(--color-toolbar-text)', opacity: 0.7,
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!value.trim()}
            style={{
              flex: 2,
              padding: '8px 0',
              background: value.trim() ? 'var(--color-selection-ring)' : 'rgba(128,128,128,0.2)',
              border: 'none', borderRadius: 6,
              cursor: value.trim() ? 'pointer' : 'default',
              fontSize: 13, fontWeight: 600, color: '#fff',
              opacity: value.trim() ? 1 : 0.5,
            }}
          >
            Join room
          </button>
        </div>
      </div>
    </div>
  );
}
