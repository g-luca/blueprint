import { type NodeProps } from '@xyflow/react';
import { StorageIcon } from '../icons';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function StorageNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<StorageIcon size={22} />} accentColor="#f59e0b" />;
}
