import { type NodeProps } from '@xyflow/react';
import { MdPublic } from 'react-icons/md';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function DnsNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<MdPublic size={16} />} accentColor="#22d3ee" />;
}
