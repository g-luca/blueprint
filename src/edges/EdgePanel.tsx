import { useFlowStore } from '../store/useFlowStore';
import type {
  FlowEdgeData, EdgeColor, EdgeStrokeWidth, EdgeStrokeStyle, EdgeRouting,
} from '../types/edges';
import { EDGE_COLOR_VALUES } from '../types/edges';

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em',
        textTransform: 'uppercase', opacity: 0.5, color: 'var(--color-toolbar-text)' }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: '4px' }}>{children}</div>
    </div>
  );
}

const btnBase: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer',
  padding: 0, flexShrink: 0,
};

function Btn({
  active, onClick, title, children,
}: {
  active?: boolean; onClick: () => void; title?: string; children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        ...btnBase,
        background: active ? 'var(--color-selection-ring)' : 'rgba(255,255,255,0.07)',
        color: active ? 'var(--color-canvas-bg)' : 'var(--color-toolbar-text)',
      }}
    >
      {children}
    </button>
  );
}

// ─── Inline SVG icons ─────────────────────────────────────────────────────────

function IconThin() {
  return <svg width="18" height="10" viewBox="0 0 18 10"><line x1="1" y1="5" x2="17" y2="5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>;
}
function IconMedium() {
  return <svg width="18" height="10" viewBox="0 0 18 10"><line x1="1" y1="5" x2="17" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}
function IconThick() {
  return <svg width="18" height="10" viewBox="0 0 18 10"><line x1="1" y1="5" x2="17" y2="5" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/></svg>;
}

function IconSolid() {
  return <svg width="18" height="10" viewBox="0 0 18 10"><line x1="1" y1="5" x2="17" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}
function IconDashed() {
  return <svg width="18" height="10" viewBox="0 0 18 10"><line x1="1" y1="5" x2="17" y2="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round"/></svg>;
}
function IconDotted() {
  return <svg width="18" height="10" viewBox="0 0 18 10"><line x1="1" y1="5" x2="17" y2="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.5 3" strokeLinecap="round"/></svg>;
}

function IconStep() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14">
      <polyline points="1,13 1,1 17,1 17,13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconBezier() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14">
      <path d="M1,13 C1,1 17,1 17,13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function IconSmoothStep() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14">
      <path d="M1,13 L1,7 Q1,1 7,1 L11,1 Q17,1 17,7 L17,13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconNoArrow() {
  return (
    <svg width="20" height="10" viewBox="0 0 20 10">
      <line x1="1" y1="5" x2="19" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function IconArrow() {
  return (
    <svg width="20" height="10" viewBox="0 0 20 10">
      <line x1="1" y1="5" x2="15" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <polygon points="19,5 13,2 13,8" fill="currentColor"/>
    </svg>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

interface Props {
  id: string;
  data: Partial<FlowEdgeData>;
}

export function EdgePanel({ id, data }: Props) {
  const updateEdgeData = useFlowStore((s) => s.updateEdgeData);

  const color       = (data.color       ?? 'default')  as EdgeColor;
  const strokeWidth = (data.strokeWidth ?? 'medium')   as EdgeStrokeWidth;
  const strokeStyle = (data.strokeStyle ?? 'dashed')   as EdgeStrokeStyle;
  const routing     = (data.routing     ?? 'step')     as EdgeRouting;
  const arrowhead   = data.arrowhead ?? true;

  const upd = (patch: Partial<FlowEdgeData>) => updateEdgeData(id, patch);

  const colors: { key: EdgeColor; value: string }[] = [
    { key: 'default', value: EDGE_COLOR_VALUES.default },
    { key: 'red',     value: EDGE_COLOR_VALUES.red },
    { key: 'green',   value: EDGE_COLOR_VALUES.green },
    { key: 'blue',    value: EDGE_COLOR_VALUES.blue },
    { key: 'orange',  value: EDGE_COLOR_VALUES.orange },
    { key: 'gray',    value: EDGE_COLOR_VALUES.gray },
  ];

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        display: 'flex', flexDirection: 'column', gap: '10px',
        background: 'var(--color-toolbar-bg)',
        border: '1px solid var(--color-node-border)',
        borderRadius: 10, padding: '10px 12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        minWidth: 212,
        userSelect: 'none',
      }}
    >
      {/* Stroke color */}
      <Section label="Stroke">
        {colors.map(({ key, value }) => (
          <button
            key={key}
            title={key}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => upd({ color: key })}
            style={{
              ...btnBase,
              background: value,
              outline: color === key ? '2px solid var(--color-selection-ring)' : '2px solid transparent',
              outlineOffset: 1,
            }}
          />
        ))}
      </Section>

      {/* Stroke width */}
      <Section label="Stroke width">
        <Btn active={strokeWidth === 'thin'}   onClick={() => upd({ strokeWidth: 'thin' })}   title="Thin"><IconThin /></Btn>
        <Btn active={strokeWidth === 'medium'} onClick={() => upd({ strokeWidth: 'medium' })} title="Medium"><IconMedium /></Btn>
        <Btn active={strokeWidth === 'thick'}  onClick={() => upd({ strokeWidth: 'thick' })}  title="Thick"><IconThick /></Btn>
      </Section>

      {/* Stroke style */}
      <Section label="Stroke style">
        <Btn active={strokeStyle === 'solid'}  onClick={() => upd({ strokeStyle: 'solid' })}  title="Solid"><IconSolid /></Btn>
        <Btn active={strokeStyle === 'dashed'} onClick={() => upd({ strokeStyle: 'dashed' })} title="Dashed"><IconDashed /></Btn>
        <Btn active={strokeStyle === 'dotted'} onClick={() => upd({ strokeStyle: 'dotted' })} title="Dotted"><IconDotted /></Btn>
      </Section>

      {/* Arrow type */}
      <Section label="Arrow type">
        <Btn active={routing === 'step'}       onClick={() => upd({ routing: 'step' })}       title="Elbow"><IconStep /></Btn>
        <Btn active={routing === 'bezier'}     onClick={() => upd({ routing: 'bezier' })}     title="Bezier"><IconBezier /></Btn>
        <Btn active={routing === 'smoothstep'} onClick={() => upd({ routing: 'smoothstep' })} title="Smooth"><IconSmoothStep /></Btn>
      </Section>

      {/* Arrowheads */}
      <Section label="Arrowheads">
        <Btn active={!arrowhead} onClick={() => upd({ arrowhead: false })} title="No arrowhead"><IconNoArrow /></Btn>
        <Btn active={arrowhead}  onClick={() => upd({ arrowhead: true })}  title="Arrowhead"><IconArrow /></Btn>
      </Section>
    </div>
  );
}
