import { type NodeProps } from '@xyflow/react';
import { MdPerson } from 'react-icons/md';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function ClientNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<MdPerson size={16} />} accentColor="#38bdf8" />;
}
