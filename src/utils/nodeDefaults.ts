import type { NodeType, BaseNodeData } from '../types/nodes';

// All dimensions are multiples of 20 to align with the snap grid
export const NODE_DIMENSIONS: Record<NodeType, { width: number; height: number }> = {
  text:         { width: 160, height: 40  },
  rectangle:    { width: 140, height: 100 },
  circle:       { width: 80,  height: 80  },

  browser:      { width: 120, height: 40  },
  ios:          { width: 100, height: 40  },
  android:      { width: 120, height: 40  },
  tv:           { width: 100, height: 40  },
  watch:        { width: 100, height: 40  },
  vr:           { width: 100, height: 40  },
  dns:          { width: 100, height: 40  },
  cloudflare:   { width: 180, height: 80  },
  cdn:          { width: 100, height: 40  },
  loadbalancer: { width: 160, height: 60  },
  firewall:     { width: 120, height: 40  },
  service:      { width: 120, height: 40  },
  apigateway:   { width: 140, height: 40  },
  container:    { width: 120, height: 40  },
  database:     { width: 120, height: 40  },
  cache:        { width: 100, height: 40  },
  storage:      { width: 120, height: 40  },
  messagequeue: { width: 140, height: 40  },
  subdomain:    { width: 180, height: 80  },
  endpoint:       { width: 220, height: 80  },
  apispecification: { width: 200, height: 80  },
  apiservice:     { width: 200, height: 80  },
  line:           { width: 160, height: 20  },
};

/** Per-type data overrides applied when a node is first dropped onto the canvas. */
export const NODE_DEFAULT_DATA: Partial<Record<NodeType, Partial<BaseNodeData>>> = {
  cloudflare: { rps: 3 },
  endpoint:       { protocol: 'REST', method: 'GET', requestFields: [], responses: [], headers: [], security: [] },
  apispecification: { apiVersion: '1.0.0', serverUrl: 'https://api.example.com', securitySchemes: [] },
  apiservice:     { pathPrefix: '', description: '' },
};

export const NODE_DEFAULT_LABELS: Record<NodeType, string> = {
  text:         'Annotation',
  rectangle:    'Rectangle',
  circle:       'Circle',

  browser:      'Browser',
  ios:          'iOS',
  android:      'Android',
  tv:           'Smart TV',
  watch:        'Watch',
  vr:           'VR / AR',
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
  subdomain:      '',
  endpoint:       '',
  apispecification: 'My API',
  apiservice:     'Service',
  line:           '',
};
