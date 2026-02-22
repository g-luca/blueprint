import { useState, useCallback } from 'react';
import { useFlowStore } from '../../store/useFlowStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useExport } from '../../hooks/useExport';
import type { ThemeName } from '../../themes';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuItem {
  label?: string;
  shortcut?: string;
  action?: () => void;
  checked?: boolean;
  danger?: boolean;
  separator?: true;
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────

function Dropdown({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        minWidth: 210,
        background: 'var(--color-toolbar-bg)',
        border: '1px solid var(--color-node-border)',
        borderRadius: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        padding: '4px 0',
        zIndex: 9999,
      }}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return (
            <div key={i} style={{
              height: 1,
              background: 'var(--color-node-border)',
              opacity: 0.25,
              margin: '3px 0',
            }} />
          );
        }
        return (
          <button
            key={i}
            disabled={!item.action}
            onClick={() => { item.action?.(); onClose(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              padding: '0 12px 0 30px',
              height: 26,
              background: 'transparent',
              border: 'none',
              cursor: item.action ? 'pointer' : 'default',
              fontSize: 12,
              color: item.danger ? '#f87171' : 'var(--color-toolbar-text)',
              textAlign: 'left',
              position: 'relative',
              gap: 0,
            }}
            onMouseEnter={(e) => {
              if (!item.action) return;
              const el = e.currentTarget;
              el.style.background = 'var(--color-selection-ring)';
              el.style.color = '#fff';
              el.style.borderRadius = '4px';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.background = 'transparent';
              el.style.color = item.danger ? '#f87171' : 'var(--color-toolbar-text)';
              el.style.borderRadius = '0';
            }}
          >
            {/* Checkmark */}
            {item.checked !== undefined && (
              <span style={{
                position: 'absolute', left: 10,
                fontSize: 11, opacity: item.checked ? 1 : 0,
              }}>✓</span>
            )}
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.shortcut && (
              <span style={{ opacity: 0.45, fontSize: 11, marginLeft: 16 }}>
                {item.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Menu trigger ─────────────────────────────────────────────────────────────

function Menu({ label, items, openMenu, setOpenMenu }: {
  label: string;
  items: MenuItem[];
  openMenu: string | null;
  setOpenMenu: (v: string | null) => void;
}) {
  const open = openMenu === label;

  return (
    <div
      style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}
      onMouseEnter={() => setOpenMenu(label)}
      onMouseLeave={() => setOpenMenu(null)}
    >
      <button
        style={{
          height: 28,
          padding: '0 8px',
          background: open ? 'var(--color-sidebar-hover)' : 'transparent',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 12,
          color: 'var(--color-toolbar-text)',
          fontFamily: 'inherit',
        }}
      >
        {label}
      </button>
      {open && <Dropdown items={items} onClose={() => setOpenMenu(null)} />}
    </div>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

const THEME_LABELS: Record<ThemeName, string> = {
  blueprint: 'Blueprint',
  dark: 'Dark',
  light: 'Light',
};

export function Toolbar() {
  const { saveToStorage, loadFromStorage, clearCanvas, showGrid, toggleGrid } = useFlowStore();
  const { theme, setTheme } = useThemeStore();
  const { exportPng } = useExport();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const handleClear = useCallback(() => {
    if (confirm('Clear the canvas? This cannot be undone.')) clearCanvas();
  }, [clearCanvas]);

  const fileItems: MenuItem[] = [
    { label: 'Save',       shortcut: '⌘S', action: saveToStorage },
    { label: 'Load',       shortcut: '⌘O', action: loadFromStorage },
    { separator: true },
    { label: 'Export PNG', shortcut: '⌘E', action: exportPng },
    { separator: true },
    { label: 'Clear Canvas', action: handleClear, danger: true },
  ];

  const windowItems: MenuItem[] = [
    ...(['blueprint', 'dark', 'light'] as ThemeName[]).map((t) => ({
      label: THEME_LABELS[t],
      checked: theme === t,
      action: () => setTheme(t),
    })),
    { separator: true },
    { label: 'Show Grid', checked: showGrid, action: toggleGrid },
  ];

  return (
    <header
      style={{
        height: 36,
        background: 'var(--color-toolbar-bg)',
        borderBottom: '1px solid var(--color-node-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 2,
        userSelect: 'none',
      }}
    >
      {/* App name */}
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--color-node-border)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        marginRight: 8,
      }}>
        Blueprint
      </span>

      <div style={{ width: 1, height: 14, background: 'var(--color-node-border)', opacity: 0.2, marginRight: 4 }} />

      <Menu label="File"   items={fileItems}   openMenu={openMenu} setOpenMenu={setOpenMenu} />
      <Menu label="Window" items={windowItems} openMenu={openMenu} setOpenMenu={setOpenMenu} />
    </header>
  );
}
