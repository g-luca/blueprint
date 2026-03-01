// Shared message types between Cloudflare Worker and frontend.
// Uses generic record types to avoid importing @xyflow/react in the worker context.

export type EncryptedBlob = { iv: string; ciphertext: string };

export type CollabMessage =
  | {
      type: 'welcome';
      clientId: string;
      color: string;
      name: string;
      /** Other clients already connected at the time this client joined. */
      clients: { clientId: string; color: string; name: string }[];
      /** Plain snapshot for unprotected rooms; encrypted blob for password-protected rooms. */
      snapshot: { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] } | EncryptedBlob;
    }
  | {
      type: 'client_joined';
      clientId: string;
      color: string;
      name: string;
    }
  | {
      type: 'state_update';
      senderId: string;
      nodes: Record<string, unknown>[];
      edges: Record<string, unknown>[];
      iv?: never;
      ciphertext?: never;
    }
  | {
      /** Encrypted state_update — sent by clients in password-protected rooms. */
      type: 'state_update';
      senderId: string;
      iv: string;
      ciphertext: string;
      nodes?: never;
      edges?: never;
    }
  | {
      type: 'presence';
      senderId: string;
      cursor: { x: number; y: number } | null;
      color: string;
      name: string;
    }
  | { type: 'client_left'; clientId: string };
