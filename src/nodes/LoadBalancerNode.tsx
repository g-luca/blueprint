import { type NodeProps } from '@xyflow/react';
import { MdHub } from 'react-icons/md';
import { BaseNode } from './BaseNode';
import type { AppNode, BaseNodeData, LbPolicy } from '../types/nodes';
import { useFlowStore } from '../store/useFlowStore';

const POLICIES: { key: LbPolicy; label: string; title: string }[] = [
  { key: 'round-robin', label: 'RR',   title: 'Round Robin'      },
  { key: 'random',      label: 'Rand', title: 'Random'           },
  { key: 'least-conn',  label: 'LC',   title: 'Least Connections'},
  { key: 'ip-hash',     label: 'Hash', title: 'IP Hash'          },
];

function PolicyBar({ id, policy }: { id: string; policy: LbPolicy }) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  return (
    <div style={{ display: 'flex', gap: '3px' }}>
      {POLICIES.map((p) => {
        const active = policy === p.key;
        return (
          <button
            key={p.key}
            title={p.title}
            onClick={(e) => { e.stopPropagation(); updateNodeData(id, { lbPolicy: p.key }); }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              padding: '2px 0',
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              background: active ? 'var(--color-selection-ring)' : 'rgba(128,128,128,0.10)',
              color: active ? '#fff' : 'var(--color-node-text)',
              opacity: active ? 1 : 0.6,
              transition: 'none',
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

export function LoadBalancerNode(props: NodeProps<AppNode>) {
  const d = props.data as BaseNodeData;
  const policy: LbPolicy = (d.lbPolicy as LbPolicy | undefined) ?? 'round-robin';

  return (
    <BaseNode
      {...props}
      icon={<MdHub size={16} />}
      accentColor="#22c55e"
      footer={<PolicyBar id={props.id} policy={policy} />}
    />
  );
}
