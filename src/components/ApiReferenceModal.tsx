import { useEffect, useMemo } from 'react';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';
import { generateOpenApiSpec } from '../utils/openapi';
import type { AppNode } from '../types/nodes';
import type { AppEdge } from '../types/edges';

interface Props {
  onClose: () => void;
  nodes: AppNode[];
  edges: AppEdge[];
}

export function ApiReferenceModal({ onClose, nodes, edges }: Props) {
  const spec = useMemo(() => generateOpenApiSpec(nodes, edges), [nodes, edges]);

  // Suppress URL hash changes while the modal is open
  useEffect(() => {
    const originalUrl = window.location.href;
    const onHashChange = () => {
      history.replaceState(null, '', originalUrl);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      history.replaceState(null, '', originalUrl);
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'var(--color-toolbar-bg)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 12, right: 16, zIndex: 100000,
          background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 6,
          color: '#fff', fontSize: 16, fontWeight: 700,
          width: 32, height: 32, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ×
      </button>

      {/* Scalar viewer */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <ApiReferenceReact
          configuration={{
            content: spec as unknown as Record<string, unknown>,
            darkMode: true,
            hideClientButton: true,
          }}
        />
      </div>
    </div>
  );
}
