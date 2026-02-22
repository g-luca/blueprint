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
export type TextAlign  = 'left' | 'center' | 'right';
export type LbPolicy   = 'round-robin' | 'random' | 'least-conn' | 'ip-hash';

export interface BaseNodeData {
  label: string;
  text?: string;
  fontSize?: number;
  fontFamily?: FontFamily;
  textAlign?: TextAlign;
  /** Whether this node emits animated dots. Defaults to true for client types, false otherwise. */
  animated?: boolean;
  /** Throughput in k-TPS (1 = 1 000 TPS = 1 dot/s). Only meaningful when animated is true. */
  tps?: number;
  /** Load-balancing policy (loadbalancer nodes only). */
  lbPolicy?: LbPolicy;
  [key: string]: unknown;
}

export type AppNode = Node<BaseNodeData, NodeType>;
