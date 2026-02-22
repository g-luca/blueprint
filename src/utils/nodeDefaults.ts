import type { NodeType } from '../types/nodes';

// All dimensions are multiples of 20 to align with the snap grid
export const NODE_DIMENSIONS: Record<NodeType, { width: number; height: number }> = {
  text:         { width: 160, height: 40  },
  rectangle:    { width: 140, height: 100 },
  circle:       { width: 80,  height: 80  },
  triangle:     { width: 100, height: 80  },
  client:       { width: 120, height: 40  },
  dns:          { width: 100, height: 40  },
  cloudflare:   { width: 120, height: 40  },
  cdn:          { width: 100, height: 40  },
  loadbalancer: { width: 140, height: 40  },
  firewall:     { width: 120, height: 40  },
  service:      { width: 120, height: 40  },
  apigateway:   { width: 140, height: 40  },
  container:    { width: 120, height: 40  },
  database:     { width: 120, height: 40  },
  cache:        { width: 100, height: 40  },
  storage:      { width: 120, height: 40  },
  messagequeue: { width: 140, height: 40  },
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
