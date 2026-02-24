import type { Node } from '@xyflow/react';

export type NodeType =
  | 'text'
  | 'rectangle'
  | 'circle'

  | 'browser'
  | 'ios'
  | 'android'
  | 'tv'
  | 'watch'
  | 'vr'
  | 'dns'
  | 'cloudflare'
  | 'subdomain'
  | 'cdn'
  | 'loadbalancer'
  | 'firewall'
  | 'service'
  | 'apigateway'
  | 'container'
  | 'database'
  | 'cache'
  | 'storage'
  | 'messagequeue'
  | 'endpoint'
  | 'line';

export type HttpMethod  = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ApiProtocol = 'REST' | 'gRPC' | 'gRPC-bidi' | 'WS' | 'RPC';

export interface ApiResponse {
  code: string;
  types?: string[];
}

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
  /** Throughput in k-RPS (1 = 1 000 RPS = 1 dot/s). Only meaningful when animated is true. */
  rps?: number;
  /** Load-balancing policy (loadbalancer nodes only). */
  lbPolicy?: LbPolicy;
  /** Domain names hosted / proxied by this node (cloudflare, cdn, dns, etc.). */
  domains?: string[];
  [key: string]: unknown;
}

export type AppNode = Node<BaseNodeData, NodeType>;
