import { type NodeProps } from '@xyflow/react';
import { Shield } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function FirewallNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<Shield size={22} />} accentColor="#ef4444" />;
}
