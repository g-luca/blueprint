import { useCallback, useState } from 'react';
import { useStore } from '@xyflow/react';
import { useFlowStore } from '../store/useFlowStore';
import { computeEffectiveRps } from '../utils/graphRps';
import type { BaseNodeData, HttpMethod, ApiProtocol, ApiResponse } from '../types/nodes';

const PROTOCOLS: ApiProtocol[] = ['REST', 'gRPC', 'gRPC-bidi', 'WS', 'RPC'];
const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const QUICK_CODES = ['200', '201', '204', '400', '401', '403', '404', '409', '500'];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET:    '#22c55e',
  POST:   '#3b82f6',
  PUT:    '#f59e0b',
  PATCH:  '#a78bfa',
  DELETE: '#ef4444',
};

function responseColor(code: string): string {
  if (code.startsWith('2')) return '#22c55e';
  if (code.startsWith('3')) return '#3b82f6';
  if (code.startsWith('4')) return '#f59e0b';
  if (code.startsWith('5')) return '#ef4444';
  return '#9ca3af';
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

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

const btnBase: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  height: 28, border: 'none', borderRadius: 6, cursor: 'pointer',
  padding: '0 10px', flexShrink: 0, fontSize: '11px', fontWeight: 600,
};

function Btn({ active, onClick, children, style, activeColor }: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
  activeColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        ...btnBase,
        background: active ? (activeColor ?? 'var(--color-selection-ring)') : 'rgba(128,128,128,0.08)',
        color: active ? '#fff' : 'var(--color-toolbar-text)',
        ...style,
      }}
    >
      {children}
    </button>
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

// ─── Panel ────────────────────────────────────────────────────────────────────

interface Props { id: string; data: BaseNodeData; }

const formatRps = (t: number) => {
  if (t <= 0) return '0';
  if (t < 1)  return `${Math.round(t * 1000)}`;
  return `${Math.round(t * 10) / 10}k`;
};

export function EndpointPanel({ id, data }: Props) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const [customCode, setCustomCode] = useState('');
  const [showCustom, setShowCustom]  = useState(false);

  const computedRps = useStore((s) => computeEffectiveRps(s.nodes, s.edges).get(id) ?? 0);

  const protocol  = (data.protocol  as ApiProtocol  | undefined) ?? 'REST';
  const method    = (data.method    as HttpMethod    | undefined) ?? 'GET';
  const requests  = (data.requests  as string[]      | undefined) ?? [];
  const responses = (data.responses as ApiResponse[] | undefined) ?? [];

  const upd = useCallback(
    (patch: Record<string, unknown>) => updateNodeData(id, patch),
    [id, updateNodeData],
  );

  const setProtocol = (p: ApiProtocol) => {
    upd(p !== 'REST' ? { protocol: p, method: undefined } : { protocol: p });
  };

  // Request helpers
  const addRequest = () => upd({ requests: [...requests, ''] });
  const updateRequest = (i: number, val: string) =>
    upd({ requests: requests.map((r, idx) => (idx === i ? val : r)) });
  const removeRequest = (i: number) =>
    upd({ requests: requests.filter((_, idx) => idx !== i) });

  // Response helpers
  const addResponse = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed || responses.some((r) => r.code === trimmed)) return;
    upd({ responses: [...responses, { code: trimmed, types: [''] }] });
  };
  const removeResponse = (code: string) =>
    upd({ responses: responses.filter((r) => r.code !== code) });
  const addResponseType = (code: string) =>
    upd({ responses: responses.map((r) => r.code === code ? { ...r, types: [...(r.types ?? []), ''] } : r) });
  const updateResponseType = (code: string, i: number, val: string) =>
    upd({ responses: responses.map((r) => r.code === code ? { ...r, types: (r.types ?? []).map((t, idx) => idx === i ? val : t) } : r) });
  const removeResponseType = (code: string, i: number) =>
    upd({ responses: responses.map((r) => r.code === code ? { ...r, types: (r.types ?? []).filter((_, idx) => idx !== i) } : r) });

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
      {/* Protocol */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <SectionLabel>Protocol</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {PROTOCOLS.map((p) => (
            <Btn key={p} active={protocol === p} onClick={() => setProtocol(p)}>
              {p}
            </Btn>
          ))}
        </div>
      </div>

      {/* Method — REST only */}
      {protocol === 'REST' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <SectionLabel>Method</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {METHODS.map((m) => (
              <Btn
                key={m}
                active={method === m}
                onClick={() => upd({ method: m })}
                activeColor={METHOD_COLORS[m]}
              >
                {m}
              </Btn>
            ))}
          </div>
        </div>
      )}

      {/* Request fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <SectionLabel>Request</SectionLabel>
        {requests.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <input
              value={r}
              placeholder="field: type"
              onChange={(e) => updateRequest(i, e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              style={{ ...inputStyle, flex: 1, minWidth: 0 }}
            />
            <button
              onClick={() => removeRequest(i)}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-toolbar-text)', fontSize: 14, opacity: 0.45,
                padding: '0 2px', flexShrink: 0,
                display: 'flex', alignItems: 'center',
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={addRequest}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
            border: '1px dashed var(--color-node-border)', cursor: 'pointer',
            background: 'transparent', color: 'var(--color-toolbar-text)', opacity: 0.55,
            alignSelf: 'flex-start',
          }}
        >
          + add field
        </button>
      </div>

      {/* Responses */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <SectionLabel>Responses</SectionLabel>

        {/* Quick-add chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {QUICK_CODES.map((code) => {
            const exists = responses.some((r) => r.code === code);
            return (
              <button
                key={code}
                onClick={() => addResponse(code)}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={exists}
                style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4,
                  border: 'none', cursor: exists ? 'default' : 'pointer',
                  background: exists ? 'rgba(128,128,128,0.12)' : responseColor(code),
                  color: exists ? 'var(--color-toolbar-text)' : '#fff',
                  opacity: exists ? 0.4 : 1,
                }}
              >
                {code}
              </button>
            );
          })}
        </div>

        {/* Response rows */}
        {responses.map((r) => (
          <div key={r.code} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Code header row */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4,
                background: responseColor(r.code), color: '#fff', flexShrink: 0,
              }}>
                {r.code}
              </span>
              <button
                onClick={() => addResponseType(r.code)}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                  border: '1px dashed var(--color-node-border)', cursor: 'pointer',
                  background: 'transparent', color: 'var(--color-toolbar-text)', opacity: 0.5,
                }}
              >
                + field
              </button>
              <button
                onClick={() => removeResponse(r.code)}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-toolbar-text)', fontSize: 14, opacity: 0.35,
                  padding: '0 2px', marginLeft: 'auto', flexShrink: 0,
                  display: 'flex', alignItems: 'center',
                }}
              >
                ×
              </button>
            </div>
            {/* Type fields */}
            {(r.types ?? []).map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center', paddingLeft: 8 }}>
                <input
                  value={t}
                  placeholder="field: type"
                  onChange={(e) => updateResponseType(r.code, i, e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  style={{
                    flex: 1, minWidth: 0,
                    background: 'rgba(128,128,128,0.08)',
                    border: '1px solid var(--color-node-border)',
                    borderRadius: 4, padding: '3px 6px',
                    color: 'var(--color-toolbar-text)', fontSize: '10px',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => removeResponseType(r.code, i)}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-toolbar-text)', fontSize: 14, opacity: 0.45,
                    padding: '0 2px', flexShrink: 0,
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ))}

        {/* Custom code add */}
        {showCustom ? (
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              autoFocus
              value={customCode}
              placeholder="e.g. 422"
              onChange={(e) => setCustomCode(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') { addResponse(customCode); setCustomCode(''); setShowCustom(false); }
                if (e.key === 'Escape') { setCustomCode(''); setShowCustom(false); }
              }}
              style={{ ...inputStyle, flex: 1, minWidth: 0 }}
            />
            <button
              onClick={() => { addResponse(customCode); setCustomCode(''); setShowCustom(false); }}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ ...btnBase, padding: '0 8px', fontSize: 10 }}
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCustom(true)}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
              border: '1px dashed var(--color-node-border)', cursor: 'pointer',
              background: 'transparent', color: 'var(--color-toolbar-text)', opacity: 0.55,
              alignSelf: 'flex-start',
            }}
          >
            + custom code
          </button>
        )}
      </div>

      {/* Throughput — shown when upstream flow reaches this endpoint */}
      {computedRps > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <SectionLabel>Throughput</SectionLabel>
          <span style={{
            fontSize: '11px', fontWeight: 600, color: 'var(--color-toolbar-text)',
          }}>
            {formatRps(computedRps)} RPS
          </span>
        </div>
      )}
    </div>
  );
}
