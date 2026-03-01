import { useMemo } from 'react';
import { useCollab } from '../CollabContext';

export function PresenceList() {
  const { isInRoom, myColor, myName, otherCursors, isConnected } = useCollab();

  const all = useMemo(() => [
    { color: myColor, name: myName },
    ...Array.from(otherCursors.values()).map((c) => ({ color: c.color, name: c.name })),
  ], [myColor, myName, otherCursors]);

  if (!isInRoom) return null;

  const MAX_VISIBLE = 4;
  const visible = all.slice(0, MAX_VISIBLE);
  const overflow = all.length - MAX_VISIBLE;

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {visible.map((u, i) => (
        // key={name}: the server enforces unique names within a room (randomName +
        // deduplication set), so name is a stable, collision-free key here.
        <div
          key={u.name}
          title={u.name}
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: u.color,
            border: '2px solid var(--color-toolbar-bg)',
            marginLeft: i > 0 ? -6 : 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9,
            fontWeight: 700,
            color: '#fff',
            cursor: 'default',
            opacity: isConnected ? 1 : 0.5,
            zIndex: MAX_VISIBLE - i,
            position: 'relative',
          }}
        >
          {u.name.charAt(0).toUpperCase()}
        </div>
      ))}
      {overflow > 0 && (
        <span style={{ fontSize: 10, color: 'var(--color-toolbar-text)', opacity: 0.5, marginLeft: 4 }}>
          +{overflow}
        </span>
      )}
    </div>
  );
}
