import type { NodeProps } from '@xyflow/react';
import type { AppNode } from '../types/nodes';
import { BaseNode } from './BaseNode';

export function RectangleNode(props: NodeProps<AppNode>) {
  return (
    <BaseNode
      {...props}
      bodyStyle={{ borderRadius: 0 }}
    />
  );
}
