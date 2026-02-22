import type { NodeProps } from '@xyflow/react';
import type { AppNode } from '../types/nodes';
import { BaseNode } from './BaseNode';

export function TriangleNode(props: NodeProps<AppNode>) {
  return (
    <BaseNode
      {...props}
      bodyStyle={{
        borderRadius: 0,
        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
        justifyContent: 'flex-end',
        paddingBottom: '18px',
      }}
    />
  );
}
