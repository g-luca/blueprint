import { useEffect } from 'react';
import { type NodeProps, useReactFlow } from '@xyflow/react';
import { MdStorage } from 'react-icons/md';
import { BaseNode } from './BaseNode';
import { ReplicaRows, replicaNodeHeight } from './ReplicaStack';
import type { AppNode } from '../types/nodes';

export function ServiceNode(props: NodeProps<AppNode>) {
  const replicaCount = (props.data.replicaCount as number | undefined) ?? 0;
  const { updateNode } = useReactFlow();

  useEffect(() => {
    updateNode(props.id, { height: replicaNodeHeight(replicaCount) });
  }, [replicaCount, props.id, updateNode]);

  return (
    <BaseNode
      {...props}
      icon={<MdStorage size={16} />}
      accentColor="#3b82f6"
      footer={replicaCount > 0
        ? <ReplicaRows count={replicaCount} icon={<MdStorage size={11} />} />
        : undefined
      }
    />
  );
}
