import { type NodeProps } from '@xyflow/react';
import { Network } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function LoadBalancerNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<Network size={22} />} accentColor="#22c55e" />;
}
