import { type NodeProps } from '@xyflow/react';
import { MdRouter } from 'react-icons/md';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function ApiGatewayNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<MdRouter size={16} />} accentColor="#8b5cf6" />;
}
