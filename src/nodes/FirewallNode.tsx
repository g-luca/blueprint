import { type NodeProps } from '@xyflow/react';
import { MdSecurity } from 'react-icons/md';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function FirewallNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<MdSecurity size={16} />} accentColor="#ef4444" />;
}
