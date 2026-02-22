import { type NodeProps } from '@xyflow/react';
import { KafkaIcon } from '../icons';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function MessageQueueNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<KafkaIcon size={22} />} accentColor="#a855f7" />;
}
