import { type NodeProps } from '@xyflow/react';
import { MdHub } from 'react-icons/md';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function LoadBalancerNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<MdHub size={16} />} accentColor="#22c55e" />;
}
