import { type NodeProps } from '@xyflow/react';
import { Route } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { AppNode, BaseNodeData } from '../types/nodes';
import { useFlowStore } from '../store/useFlowStore';

// ─── Record type selector ──────────────────────────────────────────────────────

type RecordType = 'A' | 'CNAME' | 'AAAA';
const RECORD_TYPES: RecordType[] = ['A', 'CNAME', 'AAAA'];

function RecordTypeBar({ id, recordType }: { id: string; recordType: RecordType }) {
  const updateNodeData  = useFlowStore((s) => s.updateNodeData);
  const updateNodeLabel = useFlowStore((s) => s.updateNodeLabel);
  return (
    <div style={{ display: 'flex', gap: '3px' }}>
      {RECORD_TYPES.map((rt) => {
        const active = recordType === rt;
        return (
          <button
            key={rt}
            onClick={(e) => {
              e.stopPropagation();
              updateNodeData(id, { recordType: rt });
              updateNodeLabel(id, '');
            }}
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
            {rt}
          </button>
        );
      })}
    </div>
  );
}

const RECORD_PLACEHOLDERS: Record<RecordType, string> = {
  A:     '93.184.216.34',
  CNAME: 'api.example.com',
  AAAA:  '2606:2800:220:1:248:1893:25c8:1946',
};

// ─── Node ─────────────────────────────────────────────────────────────────────

export function SubdomainNode(props: NodeProps<AppNode>) {
  const d = props.data as BaseNodeData;
  const recordType = (d.recordType as RecordType | undefined) ?? 'CNAME';

  return (
    <BaseNode
      {...props}
      icon={<Route size={15} />}
      accentColor="#818cf8"
      labelPlaceholder={RECORD_PLACEHOLDERS[recordType]}
      footer={<RecordTypeBar id={props.id} recordType={recordType} />}
    />
  );
}
