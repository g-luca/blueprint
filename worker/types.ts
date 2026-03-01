// Shared message types between Cloudflare Worker and frontend.
// Uses generic record types to avoid importing @xyflow/react in the worker context.

export type CollabMessage =
  | {
      type: 'welcome';
      clientId: string;
      color: string;
      name: string;
      /** True only for the first client to connect to this room instance. */
      isCreator: boolean;
      snapshot: { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] };
    }
  | {
      type: 'state_update';
      senderId: string;
      nodes: Record<string, unknown>[];
      edges: Record<string, unknown>[];
    }
  | {
      type: 'presence';
      senderId: string;
      cursor: { x: number; y: number } | null;
      color: string;
      name: string;
    }
  | { type: 'client_left'; clientId: string };
