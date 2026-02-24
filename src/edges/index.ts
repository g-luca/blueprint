import type { EdgeTypes } from '@xyflow/react';
import { AnimatedFlowEdge } from './AnimatedFlowEdge';
import { LabeledEdge } from './LabeledEdge';

export const edgeTypes = {
  flow: AnimatedFlowEdge,
  labeled: LabeledEdge,
} as EdgeTypes;
