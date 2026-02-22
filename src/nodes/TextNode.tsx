import type { NodeProps } from '@xyflow/react';
import type { AppNode } from '../types/nodes';
import { BaseNode } from './BaseNode';

export function TextNode(props: NodeProps<AppNode>) {
  return (
    <BaseNode
      {...props}
      bodyStyle={{
        background: 'transparent',
        border: '1.5px dashed var(--color-node-border)',
        borderRadius: '4px',
      }}
    />
  );
}
