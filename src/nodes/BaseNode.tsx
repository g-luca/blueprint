import { useState, useRef, useCallback, useEffect } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import type { AppNode, BaseNodeData, FontFamily } from '../types/nodes';
import { useFlowStore } from '../store/useFlowStore';
import { useThemeStore } from '../store/useThemeStore';

// ─── Constants ───────────────────────────────────────────────────────────────

export const FONT_FAMILIES: Record<FontFamily, string> = {
  sans:  'Inter, system-ui, -apple-system, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono:  '"JetBrains Mono", "Fira Code", Menlo, "Courier New", monospace',
};

const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24];

const FONT_PREVIEW: Record<FontFamily, string> = {
  sans:  'sans-serif',
  serif: 'serif',
  mono:  'monospace',
};

// ─── Toolbar helpers ──────────────────────────────────────────────────────────

const toolBtn = (active = false): React.CSSProperties => ({
  padding: '2px 7px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 600,
  lineHeight: '18px',
  background: active ? 'var(--color-selection-ring)' : 'transparent',
  color: active ? 'var(--color-canvas-bg)' : 'var(--color-toolbar-text)',
  opacity: active ? 1 : 0.75,
  transition: 'none',
});

const DIVIDER: React.CSSProperties = {
  width: 1, height: 16,
  background: 'var(--color-node-border)',
  margin: '0 2px', flexShrink: 0,
};

// ─── Component ───────────────────────────────────────────────────────────────

export interface BaseNodeProps extends NodeProps<AppNode> {
  icon?: React.ReactNode;
  accentColor?: string;
  /** Extra styles merged onto the node body div — used by shape nodes */
  bodyStyle?: React.CSSProperties;
}

export function BaseNode({ id, data, selected, icon, accentColor, bodyStyle }: BaseNodeProps) {
  const d = data as BaseNodeData;

  const [editingLabel, setEditingLabel] = useState(false);
  const [draftLabel,   setDraftLabel]   = useState('');
  const [editingText,  setEditingText]  = useState(false);
  const [draftText,    setDraftText]    = useState('');
  const labelRef = useRef<HTMLInputElement>(null);
  const textRef  = useRef<HTMLTextAreaElement>(null);

  const updateNodeLabel = useFlowStore((s) => s.updateNodeLabel);
  const updateNodeData  = useFlowStore((s) => s.updateNodeData);
  const theme = useThemeStore((s) => s.theme);

  const fontSize   = d.fontSize   ?? 12;
  const fontFamily = d.fontFamily ?? 'sans';
  // text === undefined → section hidden; '' | string → section shown (persisted in Zustand)
  const text           = d.text;
  const showTextSection = text !== undefined;

  // Auto-focus textarea whenever editingText flips to true
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

  // ── Font ───────────────────────────────────────────────────────────────────

  const applyFontFamily = useCallback(
    (ff: FontFamily) => updateNodeData(id, { fontFamily: ff }),
    [id, updateNodeData]
  );

  const changeFontSize = useCallback(
    (delta: number) => {
      let idx = FONT_SIZES.indexOf(fontSize);
      if (idx === -1) {
        idx = FONT_SIZES.findIndex((s) => s > fontSize);
        if (idx === -1) idx = FONT_SIZES.length - 1;
      }
      const next = Math.max(0, Math.min(FONT_SIZES.length - 1, idx + delta));
      updateNodeData(id, { fontSize: FONT_SIZES[next] });
    },
    [id, fontSize, updateNodeData]
  );

  // ── Text section toggle — state persisted to Zustand so it survives re-renders ──

  const toggleTextSection = useCallback(() => {
    if (showTextSection) {
      updateNodeData(id, { text: undefined });
      setEditingText(false);
    } else {
      updateNodeData(id, { text: '' });
      setEditingText(true);
    }
  }, [showTextSection, id, updateNodeData]);

  // ── Styles ─────────────────────────────────────────────────────────────────

  const effectiveAccent =
    theme === 'blueprint'
      ? 'rgba(255,255,255,0.9)'
      : (accentColor ?? 'var(--color-node-text)');

  const selectionShadow = selected
    ? '0 0 0 2px var(--color-selection-ring)'
    : undefined;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={80}
        minHeight={60}
        lineStyle={{ stroke: 'var(--color-selection-ring)', strokeWidth: 1, strokeDasharray: '4 3' }}
        handleStyle={{
          background: 'var(--color-canvas-bg)',
          border: '1.5px solid var(--color-selection-ring)',
          width: 8, height: 8, borderRadius: 2,
        }}
      />

      {/*
        Toolbar rendered as a regular absolutely-positioned div — NOT a portal.
        NodeToolbar uses a portal which causes the pane's click handler to fire
        (deselecting the node) before the button onClick completes, resetting all
        local state. This approach keeps the toolbar in the node's own DOM subtree,
        so stopPropagation on mousedown reliably blocks that deselection.
      */}
      {selected && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            background: 'var(--color-toolbar-bg)',
            border: '1px solid var(--color-node-border)',
            borderRadius: '8px',
            padding: '4px 8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            pointerEvents: 'all',
          }}
        >
          {/* Font family */}
          {(['sans', 'serif', 'mono'] as const).map((ff) => (
            <button
              key={ff}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => applyFontFamily(ff)}
              title={`Font: ${ff}`}
              style={{ ...toolBtn(fontFamily === ff), fontFamily: FONT_PREVIEW[ff] }}
            >
              {ff === 'sans' ? 'Sans' : ff === 'serif' ? 'Serif' : 'Mono'}
            </button>
          ))}

          <div style={DIVIDER} />

          {/* Font size */}
          <button onMouseDown={(e) => e.stopPropagation()} onClick={() => changeFontSize(-1)}
            title="Smaller" style={{ ...toolBtn(), padding: '2px 5px' }}>A−</button>
          <span style={{ fontSize: '11px', color: 'var(--color-toolbar-text)', opacity: 0.75,
            minWidth: '30px', textAlign: 'center' }}>
            {fontSize}px
          </span>
          <button onMouseDown={(e) => e.stopPropagation()} onClick={() => changeFontSize(+1)}
            title="Larger" style={{ ...toolBtn(), padding: '2px 5px' }}>A+</button>

          <div style={DIVIDER} />

          {/* Text section toggle */}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={toggleTextSection}
            title={showTextSection ? 'Remove text' : 'Add text'}
            style={toolBtn(showTextSection)}
          >T</button>
        </div>
      )}

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
          border: '1.5px solid var(--color-node-border)',
          borderRadius: '8px',
          padding: '10px 12px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '5px',
          color: 'var(--color-node-text)',
          backdropFilter: theme === 'blueprint' ? 'blur(4px)' : undefined,
          cursor: 'default',
          userSelect: 'none',
          overflow: 'hidden',
          boxShadow: selectionShadow,
          // Shape overrides (circle, text block, etc.)
          ...bodyStyle,
        }}
      >
        {/* Icon (omitted for shape nodes) */}
        {icon && (
          <div style={{ color: effectiveAccent, display: 'flex', flexShrink: 0 }}>
            {icon}
          </div>
        )}

        {/* Label — font family & size apply here so changes are immediately visible */}
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
              background: 'transparent', border: 'none',
              borderBottom: '1px solid var(--color-node-border)',
              color: 'var(--color-node-text)',
              fontSize: `${fontSize}px`,
              fontFamily: FONT_FAMILIES[fontFamily],
              fontWeight: 600, textAlign: 'center', outline: 'none',
              width: '100%', flexShrink: 0,
            }}
          />
        ) : (
          <span style={{
            fontSize: `${fontSize}px`,
            fontFamily: FONT_FAMILIES[fontFamily],
            fontWeight: 600,
            letterSpacing: '0.02em',
            textAlign: 'center',
            flexShrink: 0,
          }}>
            {d.label}
          </span>
        )}

        {/* Optional text body */}
        {showTextSection && (
          <div
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            style={{
              flex: 1, width: '100%',
              borderTop: '1px solid var(--color-node-border)',
              paddingTop: '6px', marginTop: '2px',
              minHeight: 0, display: 'flex', flexDirection: 'column',
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
                  minHeight: '36px',
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
                  opacity: text ? 0.85 : 0.35, cursor: 'text',
                }}
              >
                {text || 'Click to add text…'}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
