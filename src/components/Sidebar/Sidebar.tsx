import { useState, useRef, useEffect } from 'react';
import { MdSearch } from 'react-icons/md';
import { PALETTE_CATEGORIES } from '../../data/palette';
import { PaletteCategory } from './PaletteCategory';
import { PaletteItem } from './PaletteItem';

export function Sidebar() {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const q = query.trim().toLowerCase();

  const filteredCategories = PALETTE_CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) => item.label.toLowerCase().includes(q)),
  })).filter((cat) => cat.items.length > 0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
          padding: '12px 12px 10px',
          borderBottom: '1px solid var(--color-node-border)',
        }}
      >
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--color-canvas-bg)',
          border: '1px solid var(--color-node-border)',
          borderRadius: '6px',
          padding: '0 8px',
          opacity: 0.85,
        }}>
          <MdSearch size={14} style={{ flexShrink: 0, color: 'var(--color-node-text)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '12px',
              color: 'var(--color-node-text)',
              padding: '6px 0',
              paddingRight: query ? '0' : '36px',
              fontFamily: 'inherit',
            }}
          />
          {!query && (
            <kbd style={{
              position: 'absolute',
              right: '6px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 5px',
              fontSize: '10px',
              color: 'var(--color-node-text)',
              background: 'var(--color-sidebar-bg)',
              border: '1px solid var(--color-node-border)',
              borderRadius: '4px',
              opacity: 0.6,
              fontFamily: 'inherit',
              pointerEvents: 'none',
              letterSpacing: '0.02em',
            }}>
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Categories */}
      <div style={{ flex: 1, padding: '8px 0' }}>
        {q
          ? filteredCategories.map((cat) =>
              cat.items.map((item) => <PaletteItem key={item.type} item={item} />)
            )
          : PALETTE_CATEGORIES.map((cat) => (
              <PaletteCategory key={cat.id} category={cat} defaultOpen={true} />
            ))
        }
      </div>
    </aside>
  );
}
