import { type NodeProps } from '@xyflow/react';
import { MdStorage } from 'react-icons/md';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function ServiceNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<MdStorage size={16} />} accentColor="#3b82f6" />;
}
