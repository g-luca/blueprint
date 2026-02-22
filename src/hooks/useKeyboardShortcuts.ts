import { useEffect } from 'react';
import { useFlowStore } from '../store/useFlowStore';

export function useKeyboardShortcuts() {
  const removeSelectedElements = useFlowStore((s) => s.removeSelectedElements);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeSelectedElements();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [removeSelectedElements]);
}
