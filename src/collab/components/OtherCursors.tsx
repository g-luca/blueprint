import { useReactFlow } from '@xyflow/react';
import { useCollab } from '../CollabContext';

export function OtherCursors() {
  const { otherCursors } = useCollab();
  const { flowToScreenPosition } = useReactFlow();

  return (
    <>
      {Array.from(otherCursors.entries()).map(([clientId, info]) => {
        if (!info.cursor) return null;
        const { x, y } = flowToScreenPosition(info.cursor);
        return (
          <div
            key={clientId}
            style={{
              position: 'fixed',
              left: x,
              top: y,
              pointerEvents: 'none',
              zIndex: 9998,
            }}
          >
            {/* Cursor arrow */}
            <svg
              width="18"
              height="22"
              viewBox="0 0 18 22"
              fill="none"
              style={{ display: 'block' }}
            >
              <path
                d="M2 2L2 18L6 13L9.5 20L11.5 19L8 12L15 12L2 2Z"
                fill={info.color}
                stroke="rgba(0,0,0,0.5)"
                strokeWidth="1"
              />
            </svg>
            {/* Name tag */}
            <div
              style={{
                marginTop: 2,
                marginLeft: 4,
                background: info.color,
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
              }}
            >
              {info.name}
            </div>
          </div>
        );
      })}
    </>
  );
}
