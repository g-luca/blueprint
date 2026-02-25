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
  | 'apispecification'
  | 'apiservice'
  | 'line';

export type HttpMethod  = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ApiProtocol = 'REST' | 'gRPC' | 'gRPC-bidi' | 'WS' | 'RPC';

export type SchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';

export interface ApiField {
  name: string;
  type: SchemaType;
  required: boolean;
}

export interface ApiResponse {
  code: string;
  description: string;
  fields: ApiField[];
}

export type SecuritySchemeType = 'bearer' | 'apiKey' | 'basic';
export type ApiKeyLocation = 'header' | 'query' | 'cookie';

export interface SecurityScheme {
  name: string;
  type: SecuritySchemeType;
  apiKeyName?: string;      // apiKey only — the parameter name (e.g. "X-API-Key")
  apiKeyIn?: ApiKeyLocation; // apiKey only
}

export type FontFamily    = 'sans' | 'serif' | 'mono';
export type TextAlign     = 'left' | 'center' | 'right';
export type VerticalAlign = 'top' | 'middle' | 'bottom';
export type LbPolicy      = 'round-robin' | 'random' | 'least-conn' | 'ip-hash';

export interface BaseNodeData {
  label: string;
  text?: string;
  fontSize?: number;
  fontFamily?: FontFamily;
  textAlign?: TextAlign;
  verticalAlign?: VerticalAlign;
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
