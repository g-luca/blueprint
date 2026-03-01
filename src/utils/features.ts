/**
 * Optional override for the collab backend URL. In production the frontend
 * and worker share the same origin, so this defaults to '' (relative URLs).
 * Set VITE_COLLAB_ENDPOINT to an absolute URL only when the worker runs on a
 * different origin (e.g. local dev: http://localhost:8787).
 *
 * Collab is enabled when VITE_COLLAB_ENABLED=true or when an explicit endpoint
 * is provided. Leave both unset to run Blueprint fully offline.
 */
export const COLLAB_ENDPOINT: string =
  import.meta.env.VITE_COLLAB_ENDPOINT || '';

export const COLLAB_ENABLED: boolean =
  import.meta.env.VITE_COLLAB_ENABLED === 'true' || COLLAB_ENDPOINT !== '';
