/**
 * Set VITE_COLLAB_ENDPOINT to the URL of your Cloudflare Worker backend
 * (e.g. https://blueprint.your-account.workers.dev) to enable real-time
 * collaboration.  When absent the Share button is hidden and no WebSocket
 * connections are made — Blueprint runs fully offline.
 */
export const COLLAB_ENDPOINT: string | undefined =
  import.meta.env.VITE_COLLAB_ENDPOINT || undefined;

export const COLLAB_ENABLED = !!COLLAB_ENDPOINT;
