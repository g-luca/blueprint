import type { NodeProps } from '@xyflow/react';
import type { AppNode } from '../types/nodes';
import { BaseNode } from './BaseNode';

export function TextNode(props: NodeProps<AppNode>) {
  const borderStyle = (props.data.borderStyle as string | undefined) ?? 'dashed';
  const border = borderStyle === 'none'
    ? 'none'
    : `1.5px ${borderStyle} var(--color-node-border)`;

  return (
    <BaseNode
      {...props}
      multilineLabel
      noHandles
      bodyStyle={{
        background: 'transparent',
        border,
        borderRadius: '4px',
      }}
    />
  );
}
