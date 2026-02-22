import { type NodeProps } from '@xyflow/react';
import { Server } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function ServiceNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<Server size={22} />} accentColor="#3b82f6" />;
}
