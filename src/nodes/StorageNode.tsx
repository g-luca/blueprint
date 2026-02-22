import { type NodeProps } from '@xyflow/react';
import { SiAmazons3 } from 'react-icons/si';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function StorageNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<SiAmazons3 size={15} />} accentColor="#e25444" />;
}
