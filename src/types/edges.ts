import type { Edge } from '@xyflow/react';

export type EdgeProtocol = 'http' | 'grpc' | 'websocket' | 'tcp' | 'amqp' | 'generic';
export type EdgeColor = 'default' | 'red' | 'green' | 'blue' | 'orange' | 'gray' | 'custom';
export type EdgeStrokeWidth = 'thin' | 'medium' | 'thick';
export type EdgeStrokeStyle = 'solid' | 'dashed' | 'dotted';
export type EdgeRouting = 'step' | 'bezier' | 'smoothstep';

export interface FlowEdgeData extends Record<string, unknown> {
  protocol?: EdgeProtocol;
  label?: string;
  color?: EdgeColor;
  customColor?: string;
  strokeWidth?: EdgeStrokeWidth;
  strokeStyle?: EdgeStrokeStyle;
  routing?: EdgeRouting;
  arrowhead?: boolean;
  animated?: boolean;
}

export type AppEdge = Edge<FlowEdgeData, 'flow' | 'labeled'>;

export const PROTOCOL_COLORS: Record<EdgeProtocol, string> = {
  http:      '#60a5fa',
  grpc:      '#a78bfa',
  websocket: '#34d399',
  tcp:       '#fb923c',
  amqp:      '#f472b6',
  generic:   '#9ca3af',
};

export const EDGE_COLOR_VALUES: Record<EdgeColor, string> = {
  default: 'var(--color-node-border)',
  red:     '#f87171',
  green:   '#4ade80',
  blue:    '#60a5fa',
  orange:  '#fb923c',
  gray:    '#9ca3af',
  custom:  '#ffffff',
};
