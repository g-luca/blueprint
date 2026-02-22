import { type NodeProps } from '@xyflow/react';
import { SiDocker } from 'react-icons/si';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function ContainerNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<SiDocker size={15} />} accentColor="#2496ed" />;
}
