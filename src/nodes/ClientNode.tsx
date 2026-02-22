import { type NodeProps } from '@xyflow/react';
import { User } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function ClientNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<User size={22} />} accentColor="#38bdf8" />;
}
