import { type NodeProps } from '@xyflow/react';
import { MdWifi } from 'react-icons/md';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function CdnNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<MdWifi size={16} />} accentColor="#eab308" />;
}
