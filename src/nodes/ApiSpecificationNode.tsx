import { type NodeProps } from '@xyflow/react';
import { FileJson2, Lock } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { AppNode, BaseNodeData, SecurityScheme } from '../types/nodes';

function SpecFooter({ data }: { data: BaseNodeData }) {
  const version   = (data.apiVersion        as string | undefined) ?? '';
  const serverUrl = (data.serverUrl         as string | undefined) ?? '';
  const schemes   = (data.securitySchemes   as SecurityScheme[] | undefined) ?? [];

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
      {version && (
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
          background: '#10b981', color: '#fff', letterSpacing: '0.04em',
        }}>
          v{version}
        </span>
      )}
      {schemes.length > 0 && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 2,
          fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
          background: '#8b5cf6', color: '#fff', letterSpacing: '0.04em',
        }}>
          <Lock size={8} />{schemes.length}
        </span>
      )}
      {serverUrl && (
        <span style={{
          fontSize: 9, opacity: 0.6, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140,
        }}>
          {serverUrl}
        </span>
      )}
    </div>
  );
}

export function ApiSpecificationNode(props: NodeProps<AppNode>) {
  return (
    <BaseNode
      {...props}
      icon={<FileJson2 size={14} />}
      accentColor="#10b981"
      labelPlaceholder="API Title"
      footer={<SpecFooter data={props.data} />}
    />
  );
}
