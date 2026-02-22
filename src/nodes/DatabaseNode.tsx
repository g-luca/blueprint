import { type NodeProps } from '@xyflow/react';
import { DatabaseIcon } from '../icons';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function DatabaseNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<DatabaseIcon size={22} />} accentColor="#6366f1" />;
}
