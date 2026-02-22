import { type NodeProps } from '@xyflow/react';
import { Wifi } from 'lucide-react';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function CdnNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<Wifi size={22} />} accentColor="#eab308" />;
}
