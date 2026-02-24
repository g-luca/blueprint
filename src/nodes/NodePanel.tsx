import { useCallback, type CSSProperties } from 'react';
import { useStore } from '@xyflow/react';
import { useFlowStore } from '../store/useFlowStore';
import type { BaseNodeData, FontFamily, TextAlign } from '../types/nodes';
import { isEmitter, computeEffectiveRps, CLIENT_TYPES } from '../utils/graphRps';

const RPS_STEPS = [0.1, 0.5, 1, 2, 5, 10, 20, 50, 100];

// ─── Shared helpers (mirror EdgePanel style) ─────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <span style={{
        fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em',
        textTransform: 'uppercase', opacity: 0.5, color: 'var(--color-toolbar-text)',
      }}>
        {label}
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{children}</div>
    </div>
  );
}

const btnBase: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  height: 32, border: 'none', borderRadius: 6, cursor: 'pointer',
  padding: '0 10px', flexShrink: 0, fontSize: '12px', fontWeight: 600,
};

function Btn({ active, onClick, title, children, style }: {
  active?: boolean; onClick: () => void; title?: string;
  children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        ...btnBase,
        background: active ? 'var(--color-selection-ring)' : 'rgba(128,128,128,0.08)',
        color: active ? '#fff' : 'var(--color-toolbar-text)',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24];

const FONT_PREVIEW: Record<FontFamily, string> = {
  sans:  'Inter, system-ui, sans-serif',
  serif: 'Georgia, serif',
  mono:  'monospace',
};

// ─── Panel ────────────────────────────────────────────────────────────────────

const REPLICA_TYPES = new Set(['service', 'container']);

interface Props { id: string; data: BaseNodeData; }

export function NodePanel({ id, data }: Props) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const nodeType = useStore((s) => s.nodes.find((n) => n.id === id)?.type ?? '');

  const fontSize   = data.fontSize   ?? 11;
  const fontFamily = data.fontFamily ?? 'sans';
  const textAlign  = data.textAlign  ?? 'left';
  const hasText    = data.text !== undefined;

  // Compute effective RPS via graph traversal (aggregates upstream contributions)
  const { nodeIsEmitter, isClientType, computedRps } = useStore((s) => {
    const node = s.nodes.find((n) => n.id === id);
    const emitter    = node ? isEmitter({ type: node.type, data: node.data as Record<string, unknown> }) : false;
    const clientType = CLIENT_TYPES.has(node?.type ?? '');
    const rpsMap     = computeEffectiveRps(s.nodes, s.edges);
    return { nodeIsEmitter: emitter, isClientType: clientType, computedRps: rpsMap.get(id) ?? 0 };
  });

  // Animation defaults: ON for clients, OFF for everything else
  const animated = data.animated !== undefined ? data.animated : nodeIsEmitter;

  // Displayed RPS: explicit override takes precedence, otherwise show computed (aggregated)
  const displayRps = data.rps ?? computedRps;

  const upd = useCallback(
    (patch: Partial<BaseNodeData>) => updateNodeData(id, patch),
    [id, updateNodeData],
  );

  const changeFontSize = useCallback((delta: number) => {
    let idx = FONT_SIZES.indexOf(fontSize);
    if (idx === -1) idx = FONT_SIZES.findIndex((s) => s > fontSize);
    if (idx === -1) idx = FONT_SIZES.length - 1;
    const next = Math.max(0, Math.min(FONT_SIZES.length - 1, idx + delta));
    upd({ fontSize: FONT_SIZES[next] });
  }, [fontSize, upd]);

  const changeRps = useCallback((delta: number) => {
    let idx: number;
    if (delta < 0) {
      // largest step strictly below current value
      idx = RPS_STEPS.reduce((best, t, i) => (t < displayRps ? i : best), -1);
      if (idx === -1) return;
    } else {
      // smallest step strictly above current value
      idx = RPS_STEPS.findIndex((t) => t > displayRps);
      if (idx === -1) return;
    }
    upd({ rps: RPS_STEPS[idx] });
  }, [displayRps, upd]);

  const formatRps = (t: number) => {
    if (t <= 0) return '0';
    if (t < 1)  return `${Math.round(t * 1000)}`;
    const rounded = Math.round(t * 10) / 10;
    return `${rounded}k`;
  };

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        display: 'flex', flexDirection: 'column', gap: '10px',
        background: 'var(--color-toolbar-bg)',
        border: '1px solid var(--color-node-border)',
        borderRadius: 10, padding: '10px 12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        width: 200,
        userSelect: 'none',
      }}
    >
      {/* Font family */}
      <Section label="Font">
        {(['sans', 'serif', 'mono'] as FontFamily[]).map((ff) => (
          <Btn
            key={ff} active={fontFamily === ff}
            onClick={() => upd({ fontFamily: ff })}
            style={{ fontFamily: FONT_PREVIEW[ff] }}
          >
            {ff === 'sans' ? 'Sans' : ff === 'serif' ? 'Serif' : 'Mono'}
          </Btn>
        ))}
      </Section>

      {/* Font size */}
      <Section label="Size">
        <Btn onClick={() => changeFontSize(-1)} title="Smaller">A−</Btn>
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, fontSize: '11px', color: 'var(--color-toolbar-text)', opacity: 0.6,
        }}>
          {fontSize}
        </span>
        <Btn onClick={() => changeFontSize(+1)} title="Larger">A+</Btn>
      </Section>

      {/* Text alignment */}
      <Section label="Align">
        {(['left', 'center', 'right'] as TextAlign[]).map((ta) => (
          <Btn key={ta} active={textAlign === ta} onClick={() => upd({ textAlign: ta })}
            style={{ padding: '0 10px' }}>
            {ta === 'left' ? '⬅' : ta === 'center' ? '↔' : '➡'}
          </Btn>
        ))}
      </Section>

      {/* Text body toggle */}
      <Section label="Text">
        <Btn active={!hasText} onClick={() => upd({ text: undefined })} title="No text">—</Btn>
        <Btn active={hasText}  onClick={() => upd({ text: hasText ? data.text : '' })} title="Add text">T</Btn>
      </Section>

      {/* Border style — text nodes only */}
      {nodeType === 'text' && (() => {
        const bStyle = (data.borderStyle as string | undefined) ?? 'dashed';
        const line = (dasharray?: string) => (
          <svg width="20" height="10" viewBox="0 0 20 10" style={{ display: 'block' }}>
            <line x1="1" y1="5" x2="19" y2="5" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeDasharray={dasharray} />
          </svg>
        );
        return (
          <Section label="Border">
            <Btn active={bStyle === 'none'}   onClick={() => upd({ borderStyle: 'none' })}   title="No border"
              style={{ fontSize: 16, lineHeight: 1 }}>∅</Btn>
            <Btn active={bStyle === 'dotted'} onClick={() => upd({ borderStyle: 'dotted' })} title="Dotted">{line('1 3')}</Btn>
            <Btn active={bStyle === 'dashed'} onClick={() => upd({ borderStyle: 'dashed' })} title="Dashed">{line('5 3')}</Btn>
            <Btn active={bStyle === 'solid'}  onClick={() => upd({ borderStyle: 'solid' })}  title="Solid">{line()}</Btn>
          </Section>
        );
      })()}

      {/* Replicas (service / container only) */}
      {REPLICA_TYPES.has(nodeType) && (() => {
        const count = (data.replicaCount as number | undefined) ?? 0;
        const atMin = count === 0;
        const dim: React.CSSProperties = { opacity: 0.25, pointerEvents: 'none' };
        return (
          <Section label="Replicas">
            <Btn onClick={() => upd({ replicaCount: count - 1 })} style={atMin ? dim : undefined}>−</Btn>
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flex: 1, fontSize: '11px', color: 'var(--color-toolbar-text)', fontWeight: 600,
            }}>
              {count}
            </span>
            <Btn onClick={() => upd({ replicaCount: count + 1 })}>+</Btn>
          </Section>
        );
      })()}

      {/* Animation */}
      <Section label="Animation">
        <Btn active={!animated}
          onClick={() => upd(isClientType ? { animated: false } : { animated: false, rps: undefined })}
          title="No animation">—</Btn>
        <Btn active={animated} onClick={() => upd({ animated: true })} title="Emit dots">
          <svg width="16" height="10" viewBox="0 0 16 10">
            <line x1="0" y1="5" x2="16" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="4" cy="5" r="2.5" fill="currentColor"/>
          </svg>
        </Btn>
      </Section>

      {/* Throughput — only shown when node is animated or has upstream flow */}
      {(animated || computedRps > 0) && <div style={{ opacity: animated ? 1 : 0.35, pointerEvents: animated ? 'all' : 'none' }}>
        <Section label="Throughput">
          {animated ? (
            (() => {
              const atMin = displayRps <= RPS_STEPS[0];
              const atMax = displayRps >= RPS_STEPS[RPS_STEPS.length - 1];
              const dim: React.CSSProperties = { opacity: 0.25, pointerEvents: 'none' };
              return (
                <>
                  <Btn onClick={() => changeRps(-1)} title="Less" style={atMin ? dim : undefined}>−</Btn>
                  <span style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flex: 1, fontSize: '11px', color: 'var(--color-toolbar-text)', fontWeight: 600,
                  }}>
                    {formatRps(displayRps)} RPS
                  </span>
                  <Btn onClick={() => changeRps(+1)} title="More" style={atMax ? dim : undefined}>+</Btn>
                </>
              );
            })()
          ) : (
            <span style={{
              fontSize: '11px', color: 'var(--color-toolbar-text)', fontWeight: 600, opacity: 0.8,
            }}>
              {formatRps(computedRps)} RPS
            </span>
          )}
        </Section>
      </div>}
    </div>
  );
}

// ─── LinePanel ────────────────────────────────────────────────────────────────

const panelShell: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '10px',
  background: 'var(--color-toolbar-bg)',
  border: '1px solid var(--color-node-border)',
  borderRadius: 10, padding: '10px 12px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  width: 200,
  userSelect: 'none',
};

type Orientation = 'h' | 'v' | 'd1' | 'd2';

const DIR_COORDS: Record<Orientation, [number, number, number, number]> = {
  h:  [1,   8,  19,   8],
  v:  [10,  1,  10,  15],
  d1: [1,   1,  19,  15],
  d2: [19,  1,   1,  15],
};

function DirIcon({ orientation }: { orientation: Orientation }) {
  const [x1, y1, x2, y2] = DIR_COORDS[orientation];
  return (
    <svg width="20" height="16" viewBox="0 0 20 16" style={{ display: 'block' }}>
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function StrokeIcon({ style }: { style: string }) {
  const dash = style === 'dotted' ? '2 4' : style === 'dashed' ? '5 3' : undefined;
  return (
    <svg width="20" height="10" viewBox="0 0 20 10" style={{ display: 'block' }}>
      <line x1="1" y1="5" x2="19" y2="5"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
        strokeDasharray={dash} />
    </svg>
  );
}

export function LinePanel({ id, data }: Props) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const orientation = (data.lineOrientation as Orientation | undefined) ?? 'h';
  const strokeStyle  = (data.strokeStyle  as string       | undefined) ?? 'solid';

  const upd = useCallback(
    (patch: Partial<BaseNodeData>) => updateNodeData(id, patch),
    [id, updateNodeData],
  );

  const DIRS: Orientation[] = ['h', 'v', 'd1', 'd2'];
  const STROKES = ['solid', 'dashed', 'dotted'] as const;

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={panelShell}
    >
      <Section label="Direction">
        {DIRS.map((d) => (
          <Btn key={d} active={orientation === d} onClick={() => upd({ lineOrientation: d })}
            title={{ h: 'Horizontal', v: 'Vertical', d1: 'Diagonal ↘', d2: 'Diagonal ↗' }[d]}>
            <DirIcon orientation={d} />
          </Btn>
        ))}
      </Section>

      <Section label="Stroke">
        {STROKES.map((s) => (
          <Btn key={s} active={strokeStyle === s} onClick={() => upd({ strokeStyle: s })}
            title={s.charAt(0).toUpperCase() + s.slice(1)}>
            <StrokeIcon style={s} />
          </Btn>
        ))}
      </Section>
    </div>
  );
}
