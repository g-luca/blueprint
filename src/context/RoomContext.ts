import { createContext, useContext } from 'react';

export interface RoomContextValue {
  roomId: string | null;
  isInRoom: boolean;
  /** SHA-256 hex hash of the room password, set only by the creator. */
  passwordHash: string | undefined;
  /** Human-readable room name set at creation time; null for joiners until first save. */
  roomName: string | null;
  createRoom: (password?: string, name?: string) => Promise<void>;
  leaveRoom: () => void;
  copyLink: () => Promise<void>;
  copied: boolean;
}

export const RoomContext = createContext<RoomContextValue>({
  roomId: null,
  isInRoom: false,
  passwordHash: undefined,
  roomName: null,
  createRoom: async () => {},
  leaveRoom: () => {},
  copyLink: async () => {},
  copied: false,
});

export const useRoomContext = () => useContext(RoomContext);
