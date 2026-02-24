import { type NodeProps } from '@xyflow/react';
import { SiPostgresql } from 'react-icons/si';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function DatabaseNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<SiPostgresql size={15} />} accentColor="#336791" />;
}
