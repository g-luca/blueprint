import { type NodeProps } from '@xyflow/react';
import { MdTv } from 'react-icons/md';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function TvNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<MdTv size={16} />} accentColor="#38bdf8" />;
}
