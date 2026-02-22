import { type NodeProps } from '@xyflow/react';
import { MdOpenInBrowser } from 'react-icons/md';
import { BaseNode } from './BaseNode';
import type { AppNode } from '../types/nodes';

export function BrowserNode(props: NodeProps<AppNode>) {
  return <BaseNode {...props} icon={<MdOpenInBrowser size={16} />} accentColor="#38bdf8" />;
}
