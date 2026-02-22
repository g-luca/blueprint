import type { PaletteCategory } from '../types/palette';

export const PALETTE_CATEGORIES: PaletteCategory[] = [
  {
    id: 'shapes',
    label: 'Shapes & Annotations',
    items: [
      { type: 'text',      label: 'Text',      description: 'Free-text annotation' },
      { type: 'rectangle', label: 'Rectangle', description: 'Rectangle shape' },
      { type: 'circle',    label: 'Circle',    description: 'Circle shape' },
      { type: 'triangle',  label: 'Triangle',  description: 'Triangle shape' },
    ],
  },
  {
    id: 'network',
    label: 'Network & Ingress',
    items: [
      { type: 'client',       label: 'Client / Browser', description: 'End user or browser' },
      { type: 'dns',          label: 'DNS',              description: 'Domain Name System' },
      { type: 'cloudflare',   label: 'Cloudflare',       description: 'CDN & DDoS protection' },
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
