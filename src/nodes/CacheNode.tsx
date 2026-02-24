import { type NodeProps } from '@xyflow/react';
import { SiRedis } from 'react-icons/si';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function CacheNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<SiRedis size={15} />} accentColor="#dc382d" />;
}
