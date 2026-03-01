import { useCallback } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import type { BaseNodeData } from '../types/nodes';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em',
      textTransform: 'uppercase', opacity: 0.5, color: 'var(--color-toolbar-text)',
    }}>
      {children}
    </span>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(128,128,128,0.08)',
  border: '1px solid var(--color-node-border)',
  borderRadius: 6, padding: '5px 8px',
  color: 'var(--color-toolbar-text)', fontSize: '11px',
  outline: 'none',
};

interface Props { id: string; data: BaseNodeData; }

export function ApiServicePanel({ id, data }: Props) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const pathPrefix   = (data.pathPrefix   as string | undefined) ?? '';
  const description  = (data.description  as string | undefined) ?? '';

  const upd = useCallback(
    (patch: Record<string, unknown>) => updateNodeData(id, patch),
    [id, updateNodeData],
  );

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
        width: 240,
        userSelect: 'none',
      }}
    >
      {/* Path Prefix */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <SectionLabel>Path Prefix</SectionLabel>
        <input
          value={pathPrefix}
          placeholder="/v1"
          onChange={(e) => upd({ pathPrefix: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          style={inputStyle}
        />
      </div>

      {/* Description */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <SectionLabel>Description</SectionLabel>
        <textarea
          value={description}
          placeholder="Service description..."
          onChange={(e) => upd({ description: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          rows={3}
          style={{
            ...inputStyle,
            resize: 'vertical',
            lineHeight: 1.4,
          }}
        />
      </div>
    </div>
  );
}
