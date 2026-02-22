import { TextNode } from './TextNode';
import { RectangleNode } from './RectangleNode';
import { CircleNode } from './CircleNode';
import { TriangleNode } from './TriangleNode';
import { ClientNode } from './ClientNode';
import { DnsNode } from './DnsNode';
import { CloudflareNode } from './CloudflareNode';
import { CdnNode } from './CdnNode';
import { LoadBalancerNode } from './LoadBalancerNode';
import { FirewallNode } from './FirewallNode';
import { ServiceNode } from './ServiceNode';
import { ApiGatewayNode } from './ApiGatewayNode';
import { ContainerNode } from './ContainerNode';
import { DatabaseNode } from './DatabaseNode';
import { CacheNode } from './CacheNode';
import { StorageNode } from './StorageNode';
import { MessageQueueNode } from './MessageQueueNode';
import type { NodeTypes } from '@xyflow/react';

export const nodeTypes = {
  text:         TextNode,
  rectangle:    RectangleNode,
  circle:       CircleNode,
  triangle:     TriangleNode,
  client:       ClientNode,
  dns:          DnsNode,
  cloudflare:   CloudflareNode,
  cdn:          CdnNode,
  loadbalancer: LoadBalancerNode,
  firewall:     FirewallNode,
  service:      ServiceNode,
  apigateway:   ApiGatewayNode,
  container:    ContainerNode,
  database:     DatabaseNode,
  cache:        CacheNode,
  storage:      StorageNode,
  messagequeue: MessageQueueNode,
} as NodeTypes;
