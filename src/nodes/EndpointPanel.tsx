import { useCallback, useState, useRef } from 'react';
import { useStore } from '@xyflow/react';
import { useFlowStore } from '../store/useFlowStore';
import { computeEffectiveRps } from '../utils/graphRps';
import type { BaseNodeData, HttpMethod, ApiProtocol, ApiResponse, ApiField, SchemaType, SecurityScheme } from '../types/nodes';

const PROTOCOLS: ApiProtocol[] = ['REST', 'gRPC', 'gRPC-bidi', 'WS', 'RPC'];
const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const QUICK_CODES = ['200', '201', '204', '400', '401', '403', '404', '409', '500'];
const SCHEMA_TYPES: SchemaType[] = ['string', 'number', 'integer', 'boolean', 'array', 'object'];

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

const selectStyle: React.CSSProperties = {
  background: 'rgba(128,128,128,0.08)',
  border: '1px solid var(--color-node-border)',
  borderRadius: 4, padding: '3px 4px',
  color: 'var(--color-toolbar-text)', fontSize: '10px',
  outline: 'none', cursor: 'pointer',
};

// ─── Field row ───────────────────────────────────────────────────────────────

function FieldRow({ field, onChange, onRemove }: {
  field: ApiField;
  onChange: (f: ApiField) => void;
  onRemove: () => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      <input
        value={field.name}
        placeholder="name"
        onChange={(e) => onChange({ ...field, name: e.target.value })}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{ ...inputStyle, flex: 1, minWidth: 0, padding: '3px 6px', borderRadius: 4, fontSize: '10px' }}
      />
      <select
        value={field.type}
        onChange={(e) => onChange({ ...field, type: e.target.value as SchemaType })}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={selectStyle}
      >
        {SCHEMA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <button
        onClick={() => onChange({ ...field, required: !field.required })}
        onMouseDown={(e) => e.stopPropagation()}
        title={field.required ? 'Required' : 'Optional'}
        style={{
          cursor: 'pointer', flexShrink: 0,
          fontSize: 8, fontWeight: 700, letterSpacing: '0.02em',
          padding: '1px 4px', borderRadius: 3,
          border: `1px solid ${field.required ? '#ef4444' : 'var(--color-node-border)'}`,
          background: field.required ? 'rgba(239,68,68,0.1)' : 'transparent',
          color: field.required ? '#ef4444' : 'var(--color-toolbar-text)',
          opacity: field.required ? 1 : 0.4,
        }}
      >
        R
      </button>
      <button
        onClick={onRemove}
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
  );
}

// ─── Graph traversal: endpoint → apiservice → apispecification ───────────────

function useAvailableSchemeNames(endpointId: string): string[] {
  const prevRef = useRef<string[]>([]);

  const result = useStore((s) => {
    const edges = s.edges;
    const nodes = s.nodes;

    // Find apiservice nodes connected to this endpoint
    const serviceIds = new Set<string>();
    for (const e of edges) {
      if (e.source === endpointId || e.target === endpointId) {
        const otherId = e.source === endpointId ? e.target : e.source;
        const other = nodes.find((n) => n.id === otherId);
        if (other?.type === 'apiservice') serviceIds.add(other.id);
      }
    }

    // From apiservice nodes, find connected apispecification nodes
    const names: string[] = [];
    const seen = new Set<string>();
    for (const svcId of serviceIds) {
      for (const e of edges) {
        if (e.source === svcId || e.target === svcId) {
          const otherId = e.source === svcId ? e.target : e.source;
          if (seen.has(otherId)) continue;
          const other = nodes.find((n) => n.id === otherId);
          if (other?.type === 'apispecification') {
            seen.add(otherId);
            const specSchemes = (other.data.securitySchemes as SecurityScheme[] | undefined) ?? [];
            for (const sc of specSchemes) {
              const n = sc.name.trim();
              if (n) names.push(n);
            }
          }
        }
      }
    }
    // Return a stable JSON key for equality comparison
    return JSON.stringify(names);
  });

  const names: string[] = JSON.parse(result);
  // Return previous reference if contents haven't changed
  const prev = prevRef.current;
  if (prev.length === names.length && prev.every((v, i) => v === names[i])) {
    return prev;
  }
  prevRef.current = names;
  return names;
}

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

  const protocol      = (data.protocol      as ApiProtocol   | undefined) ?? 'REST';
  const method        = (data.method        as HttpMethod     | undefined) ?? 'GET';
  const requestFields = (data.requestFields as ApiField[]     | undefined) ?? [];
  const responses     = (data.responses     as ApiResponse[]  | undefined) ?? [];
  const headers       = (data.headers       as ApiField[]     | undefined) ?? [];
  const security      = (data.security      as string[]       | undefined) ?? [];

  const schemeNames = useAvailableSchemeNames(id);

  const upd = useCallback(
    (patch: Record<string, unknown>) => updateNodeData(id, patch),
    [id, updateNodeData],
  );

  const setProtocol = (p: ApiProtocol) => {
    upd(p !== 'REST' ? { protocol: p, method: undefined } : { protocol: p });
  };

  // Header helpers
  const addHeader = () => upd({ headers: [...headers, { name: '', type: 'string' as SchemaType, required: false }] });
  const updateHeader = (i: number, f: ApiField) =>
    upd({ headers: headers.map((h, idx) => (idx === i ? f : h)) });
  const removeHeader = (i: number) =>
    upd({ headers: headers.filter((_, idx) => idx !== i) });

  // Security toggle
  const toggleSecurity = (name: string) => {
    if (security.includes(name)) {
      upd({ security: security.filter((s) => s !== name) });
    } else {
      upd({ security: [...security, name] });
    }
  };

  // Request field helpers
  const addRequestField = () => upd({ requestFields: [...requestFields, { name: '', type: 'string' as SchemaType, required: false }] });
  const updateRequestField = (i: number, f: ApiField) =>
    upd({ requestFields: requestFields.map((r, idx) => (idx === i ? f : r)) });
  const removeRequestField = (i: number) =>
    upd({ requestFields: requestFields.filter((_, idx) => idx !== i) });

  // Response helpers
  const addResponse = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed || responses.some((r) => r.code === trimmed)) return;
    upd({ responses: [...responses, { code: trimmed, description: '', fields: [] }] });
  };
  const removeResponse = (code: string) =>
    upd({ responses: responses.filter((r) => r.code !== code) });
  const updateResponseDesc = (code: string, desc: string) =>
    upd({ responses: responses.map((r) => r.code === code ? { ...r, description: desc } : r) });
  const addResponseField = (code: string) =>
    upd({ responses: responses.map((r) => r.code === code ? { ...r, fields: [...r.fields, { name: '', type: 'string' as SchemaType, required: false }] } : r) });
  const updateResponseField = (code: string, i: number, f: ApiField) =>
    upd({ responses: responses.map((r) => r.code === code ? { ...r, fields: r.fields.map((fld, idx) => idx === i ? f : fld) } : r) });
  const removeResponseField = (code: string, i: number) =>
    upd({ responses: responses.map((r) => r.code === code ? { ...r, fields: r.fields.filter((_, idx) => idx !== i) } : r) });

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
        width: 260,
        userSelect: 'none',
        maxHeight: 'calc(100vh - 100px)',
        overflowY: 'auto',
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

      {/* Headers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <SectionLabel>Headers</SectionLabel>
        {headers.map((f, i) => (
          <FieldRow
            key={i}
            field={f}
            onChange={(updated) => updateHeader(i, updated)}
            onRemove={() => removeHeader(i)}
          />
        ))}
        <button
          onClick={addHeader}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
            border: '1px dashed var(--color-node-border)', cursor: 'pointer',
            background: 'transparent', color: 'var(--color-toolbar-text)', opacity: 0.55,
            alignSelf: 'flex-start',
          }}
        >
          + add header
        </button>
      </div>

      {/* Authentication */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <SectionLabel>Authentication</SectionLabel>
        {schemeNames.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {schemeNames.map((name) => (
              <Btn
                key={name}
                active={security.includes(name)}
                onClick={() => toggleSecurity(name)}
                activeColor="#8b5cf6"
                style={{ height: 24, fontSize: '10px', padding: '0 8px' }}
              >
                {name}
              </Btn>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: 10, opacity: 0.35, fontStyle: 'italic', color: 'var(--color-toolbar-text)' }}>
            No schemes found upstream
          </span>
        )}
      </div>

      {/* Request body fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <SectionLabel>Request Body</SectionLabel>
        {requestFields.map((f, i) => (
          <FieldRow
            key={i}
            field={f}
            onChange={(updated) => updateRequestField(i, updated)}
            onRemove={() => removeRequestField(i)}
          />
        ))}
        <button
          onClick={addRequestField}
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
              <input
                value={r.description}
                placeholder="description"
                onChange={(e) => updateResponseDesc(r.code, e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                style={{ ...inputStyle, flex: 1, minWidth: 0, padding: '2px 6px', borderRadius: 4, fontSize: '9px' }}
              />
              <button
                onClick={() => removeResponse(r.code)}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-toolbar-text)', fontSize: 14, opacity: 0.35,
                  padding: '0 2px', flexShrink: 0, display: 'flex', alignItems: 'center',
                }}
              >
                ×
              </button>
            </div>
            {/* Response body fields */}
            {r.fields.map((f, i) => (
              <div key={i} style={{ paddingLeft: 8 }}>
                <FieldRow
                  field={f}
                  onChange={(updated) => updateResponseField(r.code, i, updated)}
                  onRemove={() => removeResponseField(r.code, i)}
                />
              </div>
            ))}
            <button
              onClick={() => addResponseField(r.code)}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                border: '1px dashed var(--color-node-border)', cursor: 'pointer',
                background: 'transparent', color: 'var(--color-toolbar-text)', opacity: 0.5,
                alignSelf: 'flex-start', marginLeft: 8,
              }}
            >
              + field
            </button>
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
