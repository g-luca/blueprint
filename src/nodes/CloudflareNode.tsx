import { type NodeProps } from '@xyflow/react';
import { SiCloudflare } from 'react-icons/si';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function CloudflareNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<SiCloudflare size={15} />} accentColor="#f97316" />;
}
