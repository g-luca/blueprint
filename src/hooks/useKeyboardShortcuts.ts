import { useEffect } from 'react';
import { useFlowStore } from '../store/useFlowStore';

export function useKeyboardShortcuts() {
  const removeSelectedElements = useFlowStore((s) => s.removeSelectedElements);
  const selectAll              = useFlowStore((s) => s.selectAll);
  const copySelected           = useFlowStore((s) => s.copySelected);
  const pasteClipboard         = useFlowStore((s) => s.pasteClipboard);
  const saveToStorage          = useFlowStore((s) => s.saveToStorage);
  const loadFromStorage        = useFlowStore((s) => s.loadFromStorage);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === 'a') { e.preventDefault(); selectAll();        return; }
      if (mod && e.key === 's') { e.preventDefault(); saveToStorage();   return; }
      if (mod && e.key === 'o') { e.preventDefault(); loadFromStorage();  return; }
      if (mod && e.key === 'c') { e.preventDefault(); copySelected();     return; }
      if (mod && e.key === 'v') { e.preventDefault(); pasteClipboard();   return; }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeSelectedElements();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [removeSelectedElements, selectAll, copySelected, pasteClipboard, saveToStorage, loadFromStorage]);
}
