import { type NodeProps } from '@xyflow/react';
import { Globe } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function DnsNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<Globe size={22} />} accentColor="#22d3ee" />;
}
