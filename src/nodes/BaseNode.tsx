import { useState, useRef, useCallback, useEffect } from 'react';
import { Handle, Position, NodeResizer, useReactFlow, type NodeProps, type ResizeDragEvent, type ResizeParams } from '@xyflow/react';
import type { AppNode, BaseNodeData, FontFamily, TextAlign } from '../types/nodes';
import { useFlowStore } from '../store/useFlowStore';
import { useThemeStore } from '../store/useThemeStore';

// ─── Constants ───────────────────────────────────────────────────────────────

export const FONT_FAMILIES: Record<FontFamily, string> = {
  sans:  'Inter, system-ui, -apple-system, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono:  '"JetBrains Mono", "Fira Code", Menlo, "Courier New", monospace',
};

// ─── Component ───────────────────────────────────────────────────────────────

export interface BaseNodeProps extends NodeProps<AppNode> {
  icon?: React.ReactNode;
  accentColor?: string;
  bodyStyle?: React.CSSProperties;
  footer?: React.ReactNode;
}

const GRID = 20;
const snap = (v: number) => Math.round(v / GRID) * GRID;

export function BaseNode({ id, data, selected, icon, accentColor, bodyStyle, footer }: BaseNodeProps) {
  const d = data as BaseNodeData;
  const { updateNode } = useReactFlow();

  const [editingLabel, setEditingLabel] = useState(false);
  const [draftLabel,   setDraftLabel]   = useState('');
  const [editingText,  setEditingText]  = useState(false);
  const [draftText,    setDraftText]    = useState('');
  const labelRef = useRef<HTMLInputElement>(null);
  const textRef  = useRef<HTMLTextAreaElement>(null);

  const updateNodeLabel = useFlowStore((s) => s.updateNodeLabel);
  const updateNodeData  = useFlowStore((s) => s.updateNodeData);
  const theme = useThemeStore((s) => s.theme);

  const fontSize   = d.fontSize   ?? 11;
  const fontFamily = d.fontFamily ?? 'sans';
  const textAlign  = d.textAlign  ?? 'left';
  const text           = d.text;
  const showTextSection = text !== undefined;

  useEffect(() => {
    if (editingText) textRef.current?.focus();
  }, [editingText]);

  // ── Label ──────────────────────────────────────────────────────────────────

  const startLabelEdit = useCallback(() => {
    setDraftLabel(d.label);
    setEditingLabel(true);
    setTimeout(() => labelRef.current?.select(), 20);
  }, [d.label]);

  const commitLabel = useCallback(() => {
    if (draftLabel.trim()) updateNodeLabel(id, draftLabel.trim());
    setEditingLabel(false);
  }, [draftLabel, id, updateNodeLabel]);

  const onLabelKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter')  commitLabel();
    if (e.key === 'Escape') setEditingLabel(false);
  }, [commitLabel]);

  // ── Text body ──────────────────────────────────────────────────────────────

  const startTextEdit = useCallback(() => {
    setDraftText(text ?? '');
    setEditingText(true);
  }, [text]);

  const commitText = useCallback(() => {
    updateNodeData(id, { text: draftText });
    setEditingText(false);
  }, [draftText, id, updateNodeData]);

  const onTextKey = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    if (e.key === 'Escape') commitText();
  }, [commitText]);

  // ── Styles ─────────────────────────────────────────────────────────────────

  const effectiveAccent =
    theme === 'blueprint'
      ? 'var(--color-node-border)'
      : (accentColor ?? 'var(--color-node-text)');

  const selectionShadow = selected
    ? '0 0 0 1.5px var(--color-selection-ring)'
    : undefined;

  // ── Render ─────────────────────────────────────────────────────────────────

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

      <Handle type="source" position={Position.Top}    id="top" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Left}   id="left" />
      <Handle type="source" position={Position.Right}  id="right" />

      {/* Node body */}
      <div
        onDoubleClick={startLabelEdit}
        style={{
          width: '100%', height: '100%',
          boxSizing: 'border-box',
          background: 'var(--color-node-bg)',
          border: '1px solid var(--color-node-border)',
          borderRadius: '6px',
          padding: '0 10px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          color: 'var(--color-node-text)',
          cursor: 'default',
          userSelect: 'none',
          overflow: 'hidden',
          boxShadow: selectionShadow,
          ...bodyStyle,
        }}
      >
        {/* Header row: icon + label side by side */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          width: '100%', flexShrink: 0,
        }}>
          {icon && (
            <div style={{ color: effectiveAccent, display: 'flex', flexShrink: 0, opacity: 0.9 }}>
              {icon}
            </div>
          )}

          {editingLabel ? (
            <input
              ref={labelRef}
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={onLabelKey}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              style={{
                flex: 1, background: 'transparent', border: 'none',
                borderBottom: '1px solid var(--color-node-border)',
                color: 'var(--color-node-text)',
                fontSize: `${fontSize}px`,
                fontFamily: FONT_FAMILIES[fontFamily],
                fontWeight: 600, outline: 'none', minWidth: 0,
              }}
            />
          ) : (
            <span style={{
              flex: 1,
              fontSize: `${fontSize}px`,
              fontFamily: FONT_FAMILIES[fontFamily],
              fontWeight: 600,
              letterSpacing: '0.03em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign,
            }}>
              {d.label}
            </span>
          )}
        </div>

        {/* Optional text body */}
        {showTextSection && (
          <div
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              borderTop: '1px solid var(--color-node-border)',
              marginTop: '6px', paddingTop: '5px',
              opacity: 0.7,
              flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
            }}
          >
            {editingText ? (
              <textarea
                ref={textRef}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onBlur={commitText}
                onKeyDown={onTextKey}
                placeholder="Add a note…"
                style={{
                  flex: 1, width: '100%',
                  background: 'transparent', border: 'none',
                  color: 'var(--color-node-text)',
                  fontSize: `${fontSize}px`,
                  fontFamily: FONT_FAMILIES[fontFamily],
                  lineHeight: 1.5, resize: 'none', outline: 'none',
                  minHeight: '32px',
                }}
              />
            ) : (
              <p
                onClick={(e) => { e.stopPropagation(); startTextEdit(); }}
                style={{
                  flex: 1, margin: 0,
                  fontSize: `${fontSize}px`,
                  fontFamily: FONT_FAMILIES[fontFamily],
                  lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  opacity: text ? 1 : 0.4, cursor: 'text',
                  textAlign,
                }}
              >
                {text || 'Click to add text…'}
              </p>
            )}
          </div>
        )}

        {/* Optional footer (e.g. policy selector) */}
        {footer && (
          <div
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              borderTop: '1px solid var(--color-node-border)',
              marginTop: '5px',
              paddingTop: '5px',
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
