import { type NodeProps } from '@xyflow/react';
import { MdWatch } from 'react-icons/md';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function WatchNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<MdWatch size={16} />} accentColor="#38bdf8" />;
}
