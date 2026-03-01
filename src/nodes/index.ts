import { TextNode } from './TextNode';
import { RectangleNode } from './RectangleNode';
import { CircleNode } from './CircleNode';

import { BrowserNode } from './ClientNode';
import { IosNode } from './IosNode';
import { AndroidNode } from './AndroidNode';
import { TvNode } from './TvNode';
import { WatchNode } from './WatchNode';
import { VrNode } from './VrNode';
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
import { SubdomainNode } from './SubdomainNode';
import { EndpointNode } from './EndpointNode';
import { ApiSpecificationNode } from './ApiSpecificationNode';
import { ApiServiceNode } from './ApiServiceNode';
import { LineNode } from './LineNode';
import type { NodeTypes } from '@xyflow/react';

export const nodeTypes = {
  text:         TextNode,
  rectangle:    RectangleNode,
  circle:       CircleNode,

  browser:      BrowserNode,
  ios:          IosNode,
  android:      AndroidNode,
  tv:           TvNode,
  watch:        WatchNode,
  vr:           VrNode,
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
  subdomain:    SubdomainNode,
  endpoint:       EndpointNode,
  apispecification: ApiSpecificationNode,
  apiservice:     ApiServiceNode,
  line:           LineNode,
} as NodeTypes;
