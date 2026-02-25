import type { PaletteCategory } from '../types/palette';

export const PALETTE_CATEGORIES: PaletteCategory[] = [
  {
    id: 'shapes',
    label: 'Shapes & Annotations',
    items: [
      { type: 'text',      label: 'Text',      description: 'Free-text annotation' },
      { type: 'line',      label: 'Line',      description: 'Line / divider' },
      { type: 'rectangle', label: 'Rectangle', description: 'Rectangle shape' },
      { type: 'circle',    label: 'Circle',    description: 'Circle shape' },

    ],
  },
  {
    id: 'clients',
    label: 'Clients',
    items: [
      { type: 'browser',  label: 'Browser',  description: 'Web browser' },
      { type: 'ios',      label: 'iOS',      description: 'iPhone / iPad app' },
      { type: 'android',  label: 'Android',  description: 'Android app' },
      { type: 'tv',       label: 'Smart TV', description: 'TV / streaming app' },
      { type: 'watch',    label: 'Watch',    description: 'Smartwatch app' },
      { type: 'vr',       label: 'VR / AR',  description: 'VR or AR headset' },
    ],
  },
  {
    id: 'network',
    label: 'Network & Ingress',
    items: [
      { type: 'dns',          label: 'DNS',              description: 'Domain Name System' },
      { type: 'cloudflare',   label: 'Cloudflare',       description: 'CDN & DDoS protection' },
      { type: 'subdomain',    label: 'Subdomain',        description: 'DNS subdomain record' },
      { type: 'cdn',          label: 'CDN',              description: 'Content Delivery Network' },
      { type: 'loadbalancer', label: 'Load Balancer',    description: 'Distribute traffic' },
      { type: 'firewall',     label: 'Firewall',         description: 'Network security' },
    ],
  },
  {
    id: 'compute',
    label: 'Compute',
    items: [
      { type: 'service',    label: 'Service',        description: 'Microservice or server' },
      { type: 'apigateway', label: 'API Gateway',    description: 'Routing & auth layer' },
      { type: 'container',  label: 'Container / Pod', description: 'Docker / Kubernetes pod' },
    ],
  },
  {
    id: 'api',
    label: 'API',
    items: [
      { type: 'apispecification', label: 'Specification', description: 'OpenAPI spec root (title, version, server)' },
      { type: 'apiservice',     label: 'Service',              description: 'Service tag group with path prefix' },
      { type: 'endpoint',       label: 'Endpoint',             description: 'REST / gRPC / WS endpoint' },
    ],
  },
  {
    id: 'data',
    label: 'Data & Storage',
    items: [
      { type: 'database', label: 'Database',   description: 'Relational or document DB' },
      { type: 'cache',    label: 'Redis / Cache', description: 'In-memory cache' },
      { type: 'storage',  label: 'S3 / Storage',  description: 'Object or blob storage' },
    ],
  },
  {
    id: 'messaging',
    label: 'Messaging',
    items: [
      { type: 'messagequeue', label: 'Message Queue', description: 'Kafka / RabbitMQ / SQS' },
    ],
  },
];
