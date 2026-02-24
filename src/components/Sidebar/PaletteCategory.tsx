import { useState } from 'react';
import { MdExpandMore, MdChevronRight } from 'react-icons/md';
import type { PaletteCategory as PaletteCategoryType } from '../../types/palette';
import { PaletteItem } from './PaletteItem';

interface Props {
  category: PaletteCategoryType;
  defaultOpen?: boolean;
}

export function PaletteCategory({ category, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ marginBottom: '4px' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          width: '100%',
          padding: '6px 12px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-node-text)',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          opacity: 0.6,
        }}
      >
        {open ? <MdExpandMore size={14} /> : <MdChevronRight size={14} />}
        {category.label}
      </button>
      {open && (
        <div>
          {category.items.map((item) => (
            <PaletteItem key={item.type} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
