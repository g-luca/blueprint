import { useState, useEffect, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { hashPassword } from '../utils/crypto';

function parseRoomFromHash(): string | null {
  const hash = window.location.hash;
  const match = hash.match(/^#room\/([A-Za-z0-9_-]{1,50})$/);
  return match ? match[1] : null;
}

export function useRoom() {
  const [roomId, setRoomId] = useState<string | null>(() => parseRoomFromHash());
  const [passwordHash, setPasswordHash] = useState<string | undefined>(undefined);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onHashChange = () => {
      const id = parseRoomFromHash();
      setRoomId(id);
      // Clear cached password hash when navigating away from a room via the URL bar
      if (!id) setPasswordHash(undefined);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const createRoom = useCallback(async (password?: string, name?: string): Promise<void> => {
    const id = nanoid(8);
    let hash: string | undefined;

    // Always POST /init so the rate limiter can gate all room creation
    // regardless of whether a password is set.  For no-password rooms the
    // body is empty; for password rooms it carries the SHA-256 hash.
    const body: Record<string, string> = {};
    if (password) {
      hash = await hashPassword(password);
      body.passwordHash = hash;
    }

    const resp = await fetch(`/collab/${id}/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const msg = resp.status === 429
        ? 'Too many rooms created today. Try again tomorrow.'
        : `Failed to create room (${resp.status})`;
      throw new Error(msg);
    }

    setPasswordHash(hash);
    setRoomName(name?.trim() || `Room ${id.slice(0, 5)}`);
    window.location.hash = `room/${id}`;
    setRoomId(id);
  }, []);

  const leaveRoom = useCallback(() => {
    setPasswordHash(undefined);
    setRoomName(null);
    window.location.hash = '';
    setRoomId(null);
  }, []);

  const copyLink = useCallback(async () => {
    if (!roomId) return;
    const url = `${window.location.origin}${window.location.pathname}#room/${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (non-HTTPS, older browser) — silently ignore
    }
  }, [roomId]);

  return {
    roomId,
    isInRoom: roomId !== null,
    passwordHash,
    roomName,
    createRoom,
    leaveRoom,
    copyLink,
    copied,
  };
}
