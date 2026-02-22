import { PALETTE_CATEGORIES } from '../../data/palette';
import { PaletteCategory } from './PaletteCategory';

export function Sidebar() {
  return (
    <aside
      style={{
        width: '220px',
        minWidth: '220px',
        height: '100%',
        background: 'var(--color-sidebar-bg)',
        borderRight: '1px solid var(--color-node-border)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 14px 10px',
          borderBottom: '1px solid var(--color-node-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-node-text)' }}>
            Components
          </span>
        </div>
        <p style={{ fontSize: '10px', color: 'var(--color-node-text)', opacity: 0.5, margin: '4px 0 0' }}>
          Drag onto canvas
        </p>
      </div>

      {/* Categories */}
      <div style={{ flex: 1, padding: '8px 0' }}>
        {PALETTE_CATEGORIES.map((cat) => (
          <PaletteCategory key={cat.id} category={cat} defaultOpen={true} />
        ))}
      </div>
    </aside>
  );
}
