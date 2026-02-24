import { type NodeProps } from '@xyflow/react';
import { MdVrpano } from 'react-icons/md';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function VrNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<MdVrpano size={16} />} accentColor="#38bdf8" />;
}
