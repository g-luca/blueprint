import { useCallback } from 'react';
import { toPng } from 'html-to-image';
import type { AppNode } from '../types/nodes';
import type { AppEdge } from '../types/edges';
import { createExport } from '../utils/persistence';

export function useExport() {
  const exportPng = useCallback(async () => {
    const canvasEl = document.querySelector<HTMLElement>('.react-flow');
    if (!canvasEl) return;

    try {
      const dataUrl = await toPng(canvasEl, {
        backgroundColor: 'transparent',
        filter: (node) => {
          const el = node as HTMLElement;
          // Exclude minimap, controls, and attribution
          return (
            !el.classList?.contains('react-flow__minimap') &&
            !el.classList?.contains('react-flow__controls') &&
            !el.classList?.contains('react-flow__attribution')
          );
        },
      });

      const link = document.createElement('a');
      link.download = `blueprint-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, []);

  const exportJson = useCallback((nodes: AppNode[], edges: AppEdge[], name?: string) => {
    const fileName = name ?? 'blueprint';
    const exported = createExport(nodes, edges, fileName);
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${fileName}.blueprint.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  return { exportPng, exportJson };
}
