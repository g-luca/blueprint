import { useCallback } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import type { BaseNodeData, FontFamily, TextAlign } from '../types/nodes';

// ─── Shared helpers (mirror EdgePanel style) ─────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <span style={{
        fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em',
        textTransform: 'uppercase', opacity: 0.5, color: 'var(--color-toolbar-text)',
      }}>
        {label}
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{children}</div>
    </div>
  );
}

const btnBase: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  height: 32, border: 'none', borderRadius: 6, cursor: 'pointer',
  padding: '0 10px', flexShrink: 0, fontSize: '12px', fontWeight: 600,
};

function Btn({ active, onClick, title, children, style }: {
  active?: boolean; onClick: () => void; title?: string;
  children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        ...btnBase,
        background: active ? 'var(--color-selection-ring)' : 'rgba(128,128,128,0.08)',
        color: active ? '#fff' : 'var(--color-toolbar-text)',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24];

const FONT_PREVIEW: Record<FontFamily, string> = {
  sans:  'Inter, system-ui, sans-serif',
  serif: 'Georgia, serif',
  mono:  'monospace',
};

// ─── Panel ────────────────────────────────────────────────────────────────────

interface Props { id: string; data: BaseNodeData; }

export function NodePanel({ id, data }: Props) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const fontSize   = data.fontSize   ?? 11;
  const fontFamily = data.fontFamily ?? 'sans';
  const textAlign  = data.textAlign  ?? 'left';
  const hasText    = data.text !== undefined;

  const upd = useCallback(
    (patch: Partial<BaseNodeData>) => updateNodeData(id, patch),
    [id, updateNodeData],
  );

  const changeFontSize = useCallback((delta: number) => {
    let idx = FONT_SIZES.indexOf(fontSize);
    if (idx === -1) idx = FONT_SIZES.findIndex((s) => s > fontSize);
    if (idx === -1) idx = FONT_SIZES.length - 1;
    const next = Math.max(0, Math.min(FONT_SIZES.length - 1, idx + delta));
    upd({ fontSize: FONT_SIZES[next] });
  }, [fontSize, upd]);

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        display: 'flex', flexDirection: 'column', gap: '10px',
        background: 'var(--color-toolbar-bg)',
        border: '1px solid var(--color-node-border)',
        borderRadius: 10, padding: '10px 12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        width: 200,
        userSelect: 'none',
      }}
    >
      {/* Font family */}
      <Section label="Font">
        {(['sans', 'serif', 'mono'] as FontFamily[]).map((ff) => (
          <Btn
            key={ff} active={fontFamily === ff}
            onClick={() => upd({ fontFamily: ff })}
            style={{ fontFamily: FONT_PREVIEW[ff] }}
          >
            {ff === 'sans' ? 'Sans' : ff === 'serif' ? 'Serif' : 'Mono'}
          </Btn>
        ))}
      </Section>

      {/* Font size */}
      <Section label="Size">
        <Btn onClick={() => changeFontSize(-1)} title="Smaller">A−</Btn>
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, fontSize: '11px', color: 'var(--color-toolbar-text)', opacity: 0.6,
        }}>
          {fontSize}
        </span>
        <Btn onClick={() => changeFontSize(+1)} title="Larger">A+</Btn>
      </Section>

      {/* Text alignment */}
      <Section label="Align">
        {(['left', 'center', 'right'] as TextAlign[]).map((ta) => (
          <Btn key={ta} active={textAlign === ta} onClick={() => upd({ textAlign: ta })}
            style={{ padding: '0 10px' }}>
            {ta === 'left' ? '⬅' : ta === 'center' ? '↔' : '➡'}
          </Btn>
        ))}
      </Section>

      {/* Text body toggle */}
      <Section label="Text">
        <Btn active={!hasText} onClick={() => upd({ text: undefined })} title="No text">—</Btn>
        <Btn active={hasText}  onClick={() => upd({ text: hasText ? data.text : '' })} title="Add text">T</Btn>
      </Section>
    </div>
  );
}
