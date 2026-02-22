import { useCallback } from 'react';
import { toPng } from 'html-to-image';

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

  return { exportPng };
}
