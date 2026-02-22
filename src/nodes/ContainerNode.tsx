import { type NodeProps } from '@xyflow/react';
import { Box } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function ContainerNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<Box size={22} />} accentColor="#14b8a6" />;
}
