import type { NodeProps } from '@xyflow/react';
import type { AppNode } from '../types/nodes';
import { BaseNode } from './BaseNode';

export function CircleNode(props: NodeProps<AppNode>) {
  return (
    <BaseNode
      {...props}
      bodyStyle={{ borderRadius: '50%', padding: '8px' }}
    />
  );
}
