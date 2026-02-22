import type { Node } from '@xyflow/react';

export type NodeType =
  | 'text'
  | 'rectangle'
  | 'circle'
  | 'triangle'
  | 'browser'
  | 'ios'
  | 'android'
  | 'tv'
  | 'watch'
  | 'vr'
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
export type TextAlign = 'left' | 'center' | 'right';

export interface BaseNodeData {
  label: string;
  text?: string;
  fontSize?: number;
  fontFamily?: FontFamily;
  textAlign?: TextAlign;
  [key: string]: unknown;
}

export type AppNode = Node<BaseNodeData, NodeType>;
