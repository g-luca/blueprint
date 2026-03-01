import { describe, it, expect } from 'bun:test';
import { hashPassword, deriveEncryptionKey, encryptState, decryptState } from '../../src/utils/crypto';

describe('hashPassword', () => {
  it('returns a 64-character lowercase hex string', async () => {
    const hash = await hashPassword('hello');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('matches the known SHA-256 digest of "hello"', async () => {
    // Reference: echo -n 'hello' | sha256sum
    const hash = await hashPassword('hello');
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('is deterministic — same input always produces the same hash', async () => {
    const h1 = await hashPassword('blueprint');
    const h2 = await hashPassword('blueprint');
    expect(h1).toBe(h2);
  });

  it('produces different hashes for different inputs', async () => {
    const h1 = await hashPassword('password1');
    const h2 = await hashPassword('password2');
    expect(h1).not.toBe(h2);
  });

  it('handles an empty string', async () => {
    const hash = await hashPassword('');
    // SHA-256 of empty string
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

describe('deriveEncryptionKey', () => {
  it('returns a CryptoKey with the expected algorithm', async () => {
    const key = await deriveEncryptionKey('secret', 'room123');
    expect(key).toBeInstanceOf(CryptoKey);
    expect(key.algorithm.name).toBe('AES-GCM');
    expect((key.algorithm as AesKeyAlgorithm).length).toBe(256);
  });

  it('marks the key as non-extractable', async () => {
    const key = await deriveEncryptionKey('secret', 'room123');
    expect(key.extractable).toBe(false);
  });

  it('is deterministic — same password + roomId always yields an equivalent key', async () => {
    const nodes = [{ id: 'n1', type: 'service' }];
    const edges = [{ id: 'e1' }];
    const key1 = await deriveEncryptionKey('hunter2', 'room-abc');
    const key2 = await deriveEncryptionKey('hunter2', 'room-abc');
    // Keys are non-extractable, so compare by round-tripping through encrypt/decrypt
    const encrypted = await encryptState(key1, nodes, edges);
    const decrypted = await decryptState(key2, encrypted);
    expect(decrypted.nodes).toEqual(nodes);
    expect(decrypted.edges).toEqual(edges);
  });

  it('produces different keys for different passwords', async () => {
    const nodes = [{ id: 'n1' }];
    const key1 = await deriveEncryptionKey('pass1', 'room-abc');
    const key2 = await deriveEncryptionKey('pass2', 'room-abc');
    const encrypted = await encryptState(key1, nodes, []);
    await expect(decryptState(key2, encrypted)).rejects.toThrow();
  });

  it('produces different keys for different roomIds', async () => {
    const nodes = [{ id: 'n1' }];
    const key1 = await deriveEncryptionKey('password', 'room-A');
    const key2 = await deriveEncryptionKey('password', 'room-B');
    const encrypted = await encryptState(key1, nodes, []);
    await expect(decryptState(key2, encrypted)).rejects.toThrow();
  });
});

describe('encryptState / decryptState', () => {
  it('round-trips nodes and edges correctly', async () => {
    const key = await deriveEncryptionKey('pwd', 'rid');
    const nodes = [{ id: 'n1', type: 'service', data: { label: 'API' } }];
    const edges = [{ id: 'e1', source: 'n1', target: 'n2' }];
    const enc = await encryptState(key, nodes, edges);
    const dec = await decryptState(key, enc);
    expect(dec.nodes).toEqual(nodes);
    expect(dec.edges).toEqual(edges);
  });

  it('returns base64-encoded non-empty strings for iv and ciphertext', async () => {
    const key = await deriveEncryptionKey('pwd', 'rid');
    const { iv, ciphertext } = await encryptState(key, [], []);
    expect(typeof iv).toBe('string');
    expect(typeof ciphertext).toBe('string');
    expect(iv.length).toBeGreaterThan(0);
    expect(ciphertext.length).toBeGreaterThan(0);
    // Must be valid base64
    expect(() => atob(iv)).not.toThrow();
    expect(() => atob(ciphertext)).not.toThrow();
  });

  it('generates a fresh IV on every call (non-deterministic)', async () => {
    const key = await deriveEncryptionKey('pwd', 'rid');
    const { iv: iv1 } = await encryptState(key, [], []);
    const { iv: iv2 } = await encryptState(key, [], []);
    expect(iv1).not.toBe(iv2);
  });

  it('decryptState throws with the wrong key', async () => {
    const key1 = await deriveEncryptionKey('correct', 'room');
    const key2 = await deriveEncryptionKey('wrong', 'room');
    const enc = await encryptState(key1, [{ id: 'n' }], []);
    await expect(decryptState(key2, enc)).rejects.toThrow();
  });

  it('decryptState throws with a tampered ciphertext', async () => {
    const key = await deriveEncryptionKey('pwd', 'rid');
    const { iv, ciphertext } = await encryptState(key, [{ id: 'n' }], []);
    // Flip the last base64 character to corrupt the authentication tag
    const tampered = ciphertext.slice(0, -1) + (ciphertext.endsWith('A') ? 'B' : 'A');
    await expect(decryptState(key, { iv, ciphertext: tampered })).rejects.toThrow();
  });

  it('round-trips with empty nodes and edges', async () => {
    const key = await deriveEncryptionKey('pwd', 'rid');
    const enc = await encryptState(key, [], []);
    const dec = await decryptState(key, enc);
    expect(dec.nodes).toEqual([]);
    expect(dec.edges).toEqual([]);
  });
});
