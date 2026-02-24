import { useEffect } from 'react';
import { type NodeProps, useReactFlow } from '@xyflow/react';
import { SiDocker } from 'react-icons/si';
import { BaseNode } from './BaseNode';
import { ReplicaRows, replicaNodeHeight } from './ReplicaStack';
import type { AppNode } from '../types/nodes';

export function ContainerNode(props: NodeProps<AppNode>) {
  const replicaCount = (props.data.replicaCount as number | undefined) ?? 0;
  const { updateNode } = useReactFlow();

  useEffect(() => {
    updateNode(props.id, { height: replicaNodeHeight(replicaCount) });
  }, [replicaCount, props.id, updateNode]);

  return (
    <BaseNode
      {...props}
      icon={<SiDocker size={15} />}
      accentColor="#2496ed"
      footer={replicaCount > 0
        ? <ReplicaRows count={replicaCount} icon={<SiDocker size={11} />} />
        : undefined
      }
    />
  );
}
