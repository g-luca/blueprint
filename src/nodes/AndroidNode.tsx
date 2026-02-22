import { type NodeProps } from '@xyflow/react';
import { MdAndroid } from 'react-icons/md';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function AndroidNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<MdAndroid size={16} />} accentColor="#38bdf8" />;
}
