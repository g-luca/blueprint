import { useFlowStore } from '../store/useFlowStore';

export function Toast() {
  const toast = useFlowStore((s) => s.toast);

  if (!toast) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 52,
        right: 16,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 14px',
        background: 'var(--color-toolbar-bg)',
        border: '1px solid var(--color-node-border)',
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        fontSize: '12px',
        fontFamily: 'inherit',
        color: 'var(--color-toolbar-text)',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: 'var(--color-node-border)',
        flexShrink: 0,
      }} />
      {toast}
    </div>
  );
}
