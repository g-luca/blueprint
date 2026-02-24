import { useState } from 'react';
import { type NodeProps } from '@xyflow/react';
import { SiCloudflare } from 'react-icons/si';
import { BaseNode } from './BaseNode';
import type { AppNode, BaseNodeData } from '../types/nodes';
import { useFlowStore } from '../store/useFlowStore';

// ─── Domain editor ────────────────────────────────────────────────────────────

function DomainsFooter({ id, domains }: { id: string; domains: string[] }) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const [draft, setDraft] = useState('');

  const add = () => {
    const trimmed = draft.trim().toLowerCase();
    if (!trimmed || domains.includes(trimmed)) { setDraft(''); return; }
    updateNodeData(id, { domains: [...domains, trimmed] });
    setDraft('');
  };

  const remove = (domain: string) => {
    updateNodeData(id, { domains: domains.filter((d) => d !== domain) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {/* Domain chips */}
      {domains.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
          {domains.map((d) => (
            <span
              key={d}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '2px',
                padding: '1px 5px', borderRadius: '3px',
                background: 'rgba(249,115,22,0.12)',
                border: '1px solid rgba(249,115,22,0.25)',
                fontSize: '9px', fontWeight: 600,
                color: 'var(--color-node-text)',
                maxWidth: '100%', overflow: 'hidden',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); remove(d); }}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  border: 'none', background: 'none', cursor: 'pointer',
                  color: 'var(--color-node-text)', opacity: 0.45,
                  padding: '0 0 0 1px', fontSize: '11px', lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add domain input — hidden once a domain is set */}
      {domains.length === 0 && <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') add();
          if (e.key === 'Escape') setDraft('');
        }}
        onBlur={add}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        placeholder="+ add domain…"
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'transparent', border: 'none',
          color: 'var(--color-node-text)', opacity: 0.5,
          fontSize: '9px', fontFamily: 'inherit', outline: 'none',
        }}
      />}
    </div>
  );
}

// ─── Node ─────────────────────────────────────────────────────────────────────

export function CloudflareNode(props: NodeProps<AppNode>) {
  const d = props.data as BaseNodeData;
  const domains = (d.domains as string[] | undefined) ?? [];

  return (
    <BaseNode
      {...props}
      icon={<SiCloudflare size={15} />}
      accentColor="#f97316"
      footer={<DomainsFooter id={props.id} domains={domains} />}
    />
  );
}
