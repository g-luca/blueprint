import { type NodeProps } from '@xyflow/react';
import { CloudflareIcon } from '../icons';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function CloudflareNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<CloudflareIcon size={22} />} accentColor="#f97316" />;
}
