import { useCallback } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import type { BaseNodeData, SecurityScheme, SecuritySchemeType, ApiKeyLocation } from '../types/nodes';

const SCHEME_TYPES: SecuritySchemeType[] = ['bearer', 'apiKey', 'basic'];
const API_KEY_LOCATIONS: ApiKeyLocation[] = ['header', 'query', 'cookie'];

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

const selectStyle: React.CSSProperties = {
  background: 'rgba(128,128,128,0.08)',
  border: '1px solid var(--color-node-border)',
  borderRadius: 4, padding: '3px 4px',
  color: 'var(--color-toolbar-text)', fontSize: '10px',
  outline: 'none', cursor: 'pointer',
};

interface Props { id: string; data: BaseNodeData; }

export function ApiSpecificationPanel({ id, data }: Props) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const version     = (data.apiVersion       as string | undefined) ?? '';
  const serverUrl   = (data.serverUrl        as string | undefined) ?? '';
  const description = (data.description      as string | undefined) ?? '';
  const schemes     = (data.securitySchemes  as SecurityScheme[] | undefined) ?? [];

  const upd = useCallback(
    (patch: Record<string, unknown>) => updateNodeData(id, patch),
    [id, updateNodeData],
  );

  const addScheme = () =>
    upd({ securitySchemes: [...schemes, { name: '', type: 'bearer' as SecuritySchemeType }] });

  const updateScheme = (i: number, patch: Partial<SecurityScheme>) => {
    const updated = schemes.map((s, idx) => idx === i ? { ...s, ...patch } : s);
    upd({ securitySchemes: updated });
  };

  const removeScheme = (i: number) =>
    upd({ securitySchemes: schemes.filter((_, idx) => idx !== i) });

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
      {/* Version */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <SectionLabel>Version</SectionLabel>
        <input
          value={version}
          placeholder="1.0.0"
          onChange={(e) => upd({ apiVersion: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          style={inputStyle}
        />
      </div>

      {/* Server URL */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <SectionLabel>Server URL</SectionLabel>
        <input
          value={serverUrl}
          placeholder="https://api.example.com"
          onChange={(e) => upd({ serverUrl: e.target.value })}
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
          placeholder="API description..."
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

      {/* Security Schemes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <SectionLabel>Security Schemes</SectionLabel>
        {schemes.map((scheme, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              <input
                value={scheme.name}
                placeholder="scheme name"
                onChange={(e) => updateScheme(i, { name: e.target.value })}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                style={{ ...inputStyle, flex: 1, minWidth: 0, padding: '3px 6px', borderRadius: 4, fontSize: '10px' }}
              />
              <select
                value={scheme.type}
                onChange={(e) => updateScheme(i, { type: e.target.value as SecuritySchemeType })}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                style={selectStyle}
              >
                {SCHEME_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <button
                onClick={() => removeScheme(i)}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-toolbar-text)', fontSize: 14, opacity: 0.45,
                  padding: '0 2px', flexShrink: 0, display: 'flex', alignItems: 'center',
                }}
              >
                ×
              </button>
            </div>
            {scheme.type === 'apiKey' && (
              <div style={{ display: 'flex', gap: 3, alignItems: 'center', paddingLeft: 8 }}>
                <input
                  value={scheme.apiKeyName ?? ''}
                  placeholder="param name"
                  onChange={(e) => updateScheme(i, { apiKeyName: e.target.value })}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  style={{ ...inputStyle, flex: 1, minWidth: 0, padding: '3px 6px', borderRadius: 4, fontSize: '10px' }}
                />
                <select
                  value={scheme.apiKeyIn ?? 'header'}
                  onChange={(e) => updateScheme(i, { apiKeyIn: e.target.value as ApiKeyLocation })}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  style={selectStyle}
                >
                  {API_KEY_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            )}
          </div>
        ))}
        <button
          onClick={addScheme}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
            border: '1px dashed var(--color-node-border)', cursor: 'pointer',
            background: 'transparent', color: 'var(--color-toolbar-text)', opacity: 0.55,
            alignSelf: 'flex-start',
          }}
        >
          + add scheme
        </button>
      </div>
    </div>
  );
}
