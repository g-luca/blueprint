import { type NodeProps } from '@xyflow/react';
import { RedisIcon } from '../icons';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function CacheNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<RedisIcon size={22} />} accentColor="#fb7185" />;
}
