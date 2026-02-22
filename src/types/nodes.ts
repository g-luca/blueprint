import type { Node } from '@xyflow/react';

export type NodeType =
  | 'text'
  | 'rectangle'
  | 'circle'
  | 'triangle'
  | 'client'
  | 'dns'
  | 'cloudflare'
  | 'cdn'
  | 'loadbalancer'
  | 'firewall'
  | 'service'
  | 'apigateway'
  | 'container'
  | 'database'
  | 'cache'
  | 'storage'
  | 'messagequeue';

export type FontFamily = 'sans' | 'serif' | 'mono';

export interface BaseNodeData {
  label: string;
  text?: string;
  fontSize?: number;
  fontFamily?: FontFamily;
  [key: string]: unknown;
}

export type AppNode = Node<BaseNodeData, NodeType>;
