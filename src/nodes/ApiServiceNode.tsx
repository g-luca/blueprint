import { type NodeProps } from '@xyflow/react';
import { FolderOpen } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { AppNode, BaseNodeData } from '../types/nodes';

function ServiceFooter({ data }: { data: BaseNodeData }) {
  const pathPrefix = (data.pathPrefix as string | undefined) ?? '';

  if (!pathPrefix) return null;

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{
        fontSize: 9, opacity: 0.6, overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140,
      }}>
        {pathPrefix}
      </span>
    </div>
  );
}

export function ApiServiceNode(props: NodeProps<AppNode>) {
  return (
    <BaseNode
      {...props}
      icon={<FolderOpen size={14} />}
      accentColor="#6366f1"
      labelPlaceholder="Service Name"
      footer={<ServiceFooter data={props.data} />}
    />
  );
}
