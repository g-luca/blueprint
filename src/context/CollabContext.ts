import { createContext, useContext } from 'react';

export interface CursorInfo {
  cursor: { x: number; y: number } | null;
  color: string;
  name: string;
}

export interface CollabContextValue {
  sendPresence: (cursor: { x: number; y: number } | null) => void;
  otherCursors: Map<string, CursorInfo>;
  myClientId: string | null;
  myName: string;
  myColor: string;
  isInRoom: boolean;
  /** True once the WebSocket has received a welcome message; false while connecting or reconnecting. */
  isConnected: boolean;
}

export const CollabContext = createContext<CollabContextValue>({
  sendPresence: () => {},
  otherCursors: new Map(),
  myClientId: null,
  myName: '',
  myColor: '#60a5fa',
  isInRoom: false,
  isConnected: false,
});

export const useCollab = () => useContext(CollabContext);
