import { useEffect } from 'react';
import { useFlowStore } from '../store/useFlowStore';

const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const STEP = 20; // matches snapGrid

export function useKeyboardShortcuts() {
  const removeSelectedElements = useFlowStore((s) => s.removeSelectedElements);
  const selectAll              = useFlowStore((s) => s.selectAll);
  const copySelected           = useFlowStore((s) => s.copySelected);
  const pasteClipboard         = useFlowStore((s) => s.pasteClipboard);
  const saveToStorage          = useFlowStore((s) => s.saveToStorage);
  const undo                   = useFlowStore((s) => s.undo);
  const redo                   = useFlowStore((s) => s.redo);
  const saveSnapshot           = useFlowStore((s) => s.saveSnapshot);
  const onNodesChange          = useFlowStore((s) => s.onNodesChange);
  const nodes                  = useFlowStore((s) => s.nodes);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo();           return; }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }

      if (mod && e.key === 'a') { e.preventDefault(); selectAll();       return; }
      if (mod && e.key === 's') { e.preventDefault(); saveToStorage(); return; }
      if (mod && e.key === 'c') { e.preventDefault(); copySelected();    return; }
      if (mod && e.key === 'v') { e.preventDefault(); pasteClipboard();  return; }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeSelectedElements();
        return;
      }

      if (ARROW_KEYS.has(e.key)) {
        const selected = nodes.filter((n) => n.selected);
        if (selected.length === 0) return;
        e.preventDefault();

        const step = e.shiftKey ? STEP * 5 : STEP;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp'   ? -step : e.key === 'ArrowDown'  ? step : 0;

        saveSnapshot();
        onNodesChange(
          selected.map((n) => ({
            id: n.id,
            type: 'position' as const,
            position: { x: n.position.x + dx, y: n.position.y + dy },
            dragging: false,
          })),
        );
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [removeSelectedElements, selectAll, copySelected, pasteClipboard, saveToStorage, undo, redo, saveSnapshot, onNodesChange, nodes]);
}
