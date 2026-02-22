import type { NodeType } from '../types/nodes';

// All dimensions are multiples of 20 to align with the snap grid
export const NODE_DIMENSIONS: Record<NodeType, { width: number; height: number }> = {
  text:         { width: 180, height: 60  },
  rectangle:    { width: 160, height: 120 },
  circle:       { width: 120, height: 120 },
  triangle:     { width: 120, height: 100 },
  client:       { width: 140, height: 80  },
  dns:          { width: 140, height: 80  },
  cloudflare:   { width: 140, height: 80  },
  cdn:          { width: 140, height: 80  },
  loadbalancer: { width: 160, height: 80  },
  firewall:     { width: 140, height: 80  },
  service:      { width: 160, height: 80  },
  apigateway:   { width: 160, height: 80  },
  container:    { width: 160, height: 80  },
  database:     { width: 140, height: 100 },
  cache:        { width: 140, height: 80  },
  storage:      { width: 140, height: 100 },
  messagequeue: { width: 160, height: 80  },
};

export const NODE_DEFAULT_LABELS: Record<NodeType, string> = {
  text:         'Annotation',
  rectangle:    'Rectangle',
  circle:       'Circle',
  triangle:     'Triangle',
  client:       'Client',
  dns:          'DNS',
  cloudflare:   'Cloudflare',
  cdn:          'CDN',
  loadbalancer: 'Load Balancer',
  firewall:     'Firewall',
  service:      'Service',
  apigateway:   'API Gateway',
  container:    'Container',
  database:     'Database',
  cache:        'Redis',
  storage:      'S3 Storage',
  messagequeue: 'Message Queue',
};
