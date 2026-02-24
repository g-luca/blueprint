import { type NodeProps } from '@xyflow/react';
import { SiApachekafka } from 'react-icons/si';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function MessageQueueNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<SiApachekafka size={15} />} accentColor="#231f20" />;
}
