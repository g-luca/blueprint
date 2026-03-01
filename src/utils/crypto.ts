/** SHA-256 hash of a string, returned as a lowercase hex string. */
export async function hashPassword(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Derives an AES-GCM-256 key from a password and room ID via PBKDF2 (100k iterations, SHA-256).
 * The roomId is used as the salt — it is unique per room and never stored.
 */
export async function deriveEncryptionKey(password: string, roomId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(roomId), iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function toBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Encrypts `{ nodes, edges }` with AES-GCM-256.
 * Returns a fresh random 12-byte IV and ciphertext, both base64-encoded.
 */
export async function encryptState(
  key: CryptoKey,
  nodes: Record<string, unknown>[],
  edges: Record<string, unknown>[],
): Promise<{ iv: string; ciphertext: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify({ nodes, edges }));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return { iv: toBase64(iv), ciphertext: toBase64(encrypted) };
}

/**
 * Decrypts an `{ iv, ciphertext }` payload into `{ nodes, edges }`.
 * Throws if the key is wrong or the data has been tampered with.
 */
export async function decryptState(
  key: CryptoKey,
  payload: { iv: string; ciphertext: string },
): Promise<{ nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }> {
  const iv = fromBase64(payload.iv);
  const ciphertext = fromBase64(payload.ciphertext);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  const parsed = JSON.parse(new TextDecoder().decode(decrypted)) as {
    nodes: Record<string, unknown>[];
    edges: Record<string, unknown>[];
  };
  return { nodes: parsed.nodes, edges: parsed.edges };
}
