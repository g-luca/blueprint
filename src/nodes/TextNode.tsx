import { useState, useRef, useCallback, useEffect } from 'react';
import { NodeResizer, useReactFlow, useStore, type NodeProps, type ResizeDragEvent, type ResizeParams } from '@xyflow/react';
import type { AppNode, BaseNodeData, VerticalAlign } from '../types/nodes';
import { useFlowStore } from '../store/useFlowStore';
import { FONT_FAMILIES } from './BaseNode';

const GRID = 20;
const snap = (v: number) => Math.round(v / GRID) * GRID;
const BODY_PADDING_V = 8;   // top + bottom padding in px each
const BORDER_PX      = 1.5; // border width

export function TextNode({ id, data, selected }: NodeProps<AppNode>) {
  const d = data as BaseNodeData;
  const { updateNode }     = useReactFlow();
  const updateNodeLabel    = useFlowStore((s) => s.updateNodeLabel);

  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const measureRef  = useRef<HTMLDivElement>(null);

  const borderStyle   = (d.borderStyle as string | undefined) ?? 'dashed';
  const border        = borderStyle === 'none' ? 'none' : `1.5px ${borderStyle} var(--color-node-border)`;
  const fontSize      = d.fontSize      ?? 11;
  const fontFamily    = d.fontFamily    ?? 'sans';
  const textAlign     = d.textAlign     ?? 'left';
  const verticalAlign = (d.verticalAlign as VerticalAlign | undefined) ?? 'top';

  const selectionShadow = selected ? '0 0 0 1.5px var(--color-selection-ring)' : undefined;

  // Current text to measure (draft while editing, committed label otherwise)
  const currentText = editing ? draft : d.label;

  // ── Auto-grow ──────────────────────────────────────────────────────────────
  // Read the node's stored height directly from the store
  const nodeHeight = useStore((s) => s.nodes.find((n) => n.id === id)?.height ?? 0);

  useEffect(() => {
    if (!measureRef.current) return;
    const contentH  = measureRef.current.scrollHeight; // includes padding
    const needed    = snap(Math.max(40, contentH + Math.ceil(BORDER_PX * 2)));
    if (needed > nodeHeight) {
      updateNode(id, { height: needed });
    }
  }, [currentText, fontSize, fontFamily, nodeHeight, id, updateNode]);

  // ── Edit handlers ──────────────────────────────────────────────────────────
  const startEdit = useCallback(() => {
    setDraft(d.label);
    setEditing(true);
    setTimeout(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }, 20);
  }, [d.label]);

  const commit = useCallback(() => {
    updateNodeLabel(id, draft || ' ');
    setEditing(false);
  }, [draft, id, updateNodeLabel]);

  const onKey = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') commit();
  }, [commit]);

  // ── Styles ─────────────────────────────────────────────────────────────────
  const justifyContent =
    verticalAlign === 'bottom' ? 'flex-end'   :
    verticalAlign === 'middle' ? 'center'     : 'flex-start';

  const sharedText: React.CSSProperties = {
    fontSize:   `${fontSize}px`,
    fontFamily: FONT_FAMILIES[fontFamily],
    lineHeight: 1.5,
    textAlign,
    whiteSpace: 'pre-wrap',
    wordBreak:  'break-word',
  };

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={60}
        minHeight={40}
        onResizeEnd={(_: ResizeDragEvent, p: ResizeParams) => {
          updateNode(id, {
            position: { x: snap(p.x), y: snap(p.y) },
            width:  snap(p.width),
            height: snap(p.height),
          });
        }}
        lineStyle={{ stroke: 'var(--color-selection-ring)', strokeWidth: 1, strokeDasharray: '3 2', opacity: 0.6 }}
        handleStyle={{
          background: 'var(--color-canvas-bg)',
          border: '1px solid var(--color-selection-ring)',
          width: 6, height: 6, borderRadius: 1,
        }}
      />

      {/* Body */}
      <div
        onDoubleClick={startEdit}
        style={{
          position: 'relative',
          width: '100%', height: '100%',
          boxSizing: 'border-box',
          background: 'transparent',
          border,
          borderRadius: '4px',
          padding: `${BODY_PADDING_V}px 10px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent,
          color: 'var(--color-node-text)',
          cursor: 'default',
          userSelect: 'none',
          overflow: 'hidden',
          boxShadow: selectionShadow,
        }}
      >
        {/* Hidden measurement div — mirrors text content to compute natural height */}
        <div
          ref={measureRef}
          aria-hidden
          style={{
            ...sharedText,
            position: 'absolute',
            top: 0, left: 0, right: 0,
            padding: `${BODY_PADDING_V}px 10px`,
            visibility: 'hidden',
            pointerEvents: 'none',
            boxSizing: 'border-box',
          }}
        >
          {currentText || ' '}
        </div>

        {editing ? (
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={onKey}
            onClick={(e) => e.stopPropagation()}
            placeholder="Type here…"
            style={{
              ...sharedText,
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'var(--color-node-text)',
              resize: 'none',
              outline: 'none',
              width: '100%',
            }}
          />
        ) : (
          <div
            style={{
              ...sharedText,
              opacity: d.label?.trim() ? 1 : 0.35,
            }}
          >
            {d.label || 'Double-click to edit…'}
          </div>
        )}
      </div>
    </>
  );
}
