import { type NodeProps } from '@xyflow/react';
import { MdPhoneIphone } from 'react-icons/md';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function IosNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<MdPhoneIphone size={16} />} accentColor="#38bdf8" />;
}
