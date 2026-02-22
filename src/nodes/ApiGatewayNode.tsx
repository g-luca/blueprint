import { type NodeProps } from '@xyflow/react';
import { Radio } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function ApiGatewayNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<Radio size={22} />} accentColor="#8b5cf6" />;
}
