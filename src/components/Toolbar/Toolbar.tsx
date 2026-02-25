import { useState, useCallback, useRef, useEffect, type ChangeEvent } from 'react';
import { useFlowStore } from '../../store/useFlowStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useExport } from '../../hooks/useExport';
import { ApiReferenceModal } from '../ApiReferenceModal';
import type { ThemeName } from '../../themes';
import type { SavedFile } from '../../utils/persistence';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuItem {
  label?: string;
  shortcut?: string;
  action?: () => void;
  checked?: boolean;
  danger?: boolean;
  separator?: true;
  submenu?: MenuItem[];
  meta?: string; // secondary line (e.g. date)
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────

const dropdownShell: React.CSSProperties = {
  minWidth: 210,
  background: 'var(--color-toolbar-bg)',
  border: '1px solid var(--color-node-border)',
  borderRadius: 8,
  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  padding: '4px 0',
  zIndex: 9999,
};

function DropdownItem({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const [subOpen, setSubOpen] = useState(false);
  const hasSubmenu = !!item.submenu;
  const clickable  = !!item.action || hasSubmenu;

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => hasSubmenu && setSubOpen(true)}
      onMouseLeave={() => hasSubmenu && setSubOpen(false)}
    >
      <button
        disabled={!clickable}
        onClick={() => { if (!hasSubmenu) { item.action?.(); onClose(); } }}
        style={{
          display: 'flex', alignItems: 'center',
          width: '100%',
          padding: item.meta ? '5px 10px 5px 30px' : '0 10px 0 30px',
          height: item.meta ? undefined : 26,
          background: 'transparent', border: 'none',
          cursor: clickable ? 'pointer' : 'default',
          fontSize: 12,
          color: item.danger ? '#f87171' : 'var(--color-toolbar-text)',
          textAlign: 'left', position: 'relative',
        }}
        onMouseEnter={(e) => {
          if (!clickable) return;
          const el = e.currentTarget;
          el.style.background = 'var(--color-selection-ring)';
          el.style.color = item.danger ? '#fca5a5' : '#fff';
          el.style.borderRadius = '4px';
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.background = 'transparent';
          el.style.color = item.danger ? '#f87171' : 'var(--color-toolbar-text)';
          el.style.borderRadius = '0';
        }}
      >
        {item.checked !== undefined && (
          <span style={{ position: 'absolute', left: 10, fontSize: 11, opacity: item.checked ? 1 : 0 }}>✓</span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
          {item.meta && (
            <div style={{ fontSize: 10, opacity: 0.5, marginTop: 1 }}>{item.meta}</div>
          )}
        </div>
        {item.shortcut && (
          <span style={{ opacity: 0.45, fontSize: 11, marginLeft: 16, flexShrink: 0 }}>{item.shortcut}</span>
        )}
        {hasSubmenu && (
          <span style={{ opacity: 0.5, fontSize: 10, marginLeft: 8, flexShrink: 0 }}>▶</span>
        )}
      </button>

      {/* Submenu */}
      {hasSubmenu && subOpen && (
        <div style={{ position: 'absolute', top: -4, left: '100%', paddingLeft: 4, zIndex: 10000 }}>
          <div style={dropdownShell}>
            {item.submenu!.map((sub, j) =>
              sub.separator
                ? <div key={j} style={{ height: 1, background: 'var(--color-node-border)', opacity: 0.25, margin: '3px 0' }} />
                : <DropdownItem key={j} item={sub} onClose={onClose} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Dropdown({ items, onClose, top = true }: { items: MenuItem[]; onClose: () => void; top?: boolean }) {
  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{ ...dropdownShell, position: 'absolute', top: top ? '100%' : undefined, left: 0 }}
    >
      {items.map((item, i) =>
        item.separator
          ? <div key={i} style={{ height: 1, background: 'var(--color-node-border)', opacity: 0.25, margin: '3px 0' }} />
          : <DropdownItem key={i} item={item} onClose={onClose} />
      )}
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
      <button style={{
        height: 28, padding: '0 8px',
        background: open ? 'var(--color-sidebar-hover)' : 'transparent',
        border: 'none', borderRadius: 4, cursor: 'pointer',
        fontSize: 12, color: 'var(--color-toolbar-text)', fontFamily: 'inherit',
      }}>
        {label}
      </button>
      {open && <Dropdown items={items} onClose={() => setOpenMenu(null)} />}
    </div>
  );
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-toolbar-bg)',
          border: '1px solid var(--color-node-border)',
          borderRadius: 12,
          boxShadow: '0 16px 48px rgba(0,0,0,0.28)',
          padding: '20px 24px',
          minWidth: 320,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Name prompt ──────────────────────────────────────────────────────────────

function NamePrompt({ initial, onSave, onCancel }: {
  initial: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => { inputRef.current?.select(); }, 20);
  }, []);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed) onSave(trimmed);
  };

  return (
    <Modal onClose={onCancel}>
      <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--color-toolbar-text)' }}>
        Name this file
      </p>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') onCancel();
        }}
        placeholder="Untitled"
        autoFocus
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'rgba(128,128,128,0.08)',
          border: '1px solid var(--color-node-border)',
          borderRadius: 6, padding: '7px 10px',
          color: 'var(--color-toolbar-text)', fontSize: 13, outline: 'none',
          marginBottom: 14,
        }}
      />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={ghostBtn}>Cancel</button>
        <button onClick={commit} disabled={!value.trim()} style={primaryBtn(!!value.trim())}>Save</button>
      </div>
    </Modal>
  );
}

// ─── File browser ─────────────────────────────────────────────────────────────

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function FileBrowser({ files, currentFileId, onOpen, onDelete, onClose }: {
  files: SavedFile[];
  currentFileId: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose}>
      <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: 'var(--color-toolbar-text)' }}>
        Open file
      </p>
      {files.length === 0 ? (
        <p style={{ fontSize: 12, opacity: 0.5, color: 'var(--color-toolbar-text)', margin: '0 0 14px' }}>
          No saved files yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14, maxHeight: 320, overflowY: 'auto' }}>
          {files.map((f) => (
            <div
              key={f.id}
              onClick={() => { onOpen(f.id); onClose(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                background: f.id === currentFileId ? 'var(--color-selection-ring)' : 'rgba(128,128,128,0.06)',
                color: f.id === currentFileId ? '#fff' : 'var(--color-toolbar-text)',
              }}
              onMouseEnter={(e) => {
                if (f.id !== currentFileId)
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(128,128,128,0.12)';
              }}
              onMouseLeave={(e) => {
                if (f.id !== currentFileId)
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(128,128,128,0.06)';
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.name}
                </div>
                <div style={{ fontSize: 11, opacity: 0.55, marginTop: 1 }}>{formatDate(f.updatedAt)}</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(f.id); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'inherit', opacity: 0.45, fontSize: 16, padding: '0 2px',
                  flexShrink: 0,
                }}
                title="Delete"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={ghostBtn}>Close</button>
      </div>
    </Modal>
  );
}

// ─── Button styles ────────────────────────────────────────────────────────────

const ghostBtn: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 6, border: '1px solid var(--color-node-border)',
  background: 'transparent', cursor: 'pointer',
  fontSize: 12, fontWeight: 600, color: 'var(--color-toolbar-text)',
};

const primaryBtn = (enabled: boolean): React.CSSProperties => ({
  padding: '6px 14px', borderRadius: 6, border: 'none',
  background: enabled ? 'var(--color-selection-ring)' : 'rgba(128,128,128,0.2)',
  cursor: enabled ? 'pointer' : 'default',
  fontSize: 12, fontWeight: 600, color: '#fff',
  opacity: enabled ? 1 : 0.5,
});

// ─── Toolbar ──────────────────────────────────────────────────────────────────

const THEME_LABELS: Record<ThemeName, string> = {
  blueprint: 'Blueprint',
  dark: 'Dark',
  light: 'Light',
};

export function Toolbar() {
  const {
    saveToStorage, saveFile, saveAsFile, loadFile, deleteFile, newCanvas,
    needsNamePrompt, setNeedsNamePrompt,
    clearCanvas, showGrid, toggleGrid,
    undo, redo, past, future,
    currentFileName, currentFileId, files,
    nodes, edges, importFromJson,
  } = useFlowStore();
  const { theme, setTheme } = useThemeStore();
  const { exportPng, exportJson, exportOpenApi } = useExport();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [saveAsMode, setSaveAsMode] = useState(false);
  const [showApiRef, setShowApiRef] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const handleClear = useCallback(() => {
    if (confirm('Clear the canvas? This cannot be undone.')) clearCanvas();
  }, [clearCanvas]);

  const handleExportJson = useCallback(() => {
    exportJson(nodes, edges, currentFileName ?? undefined);
  }, [exportJson, nodes, edges, currentFileName]);

  const handleExportOpenApi = useCallback(() => {
    exportOpenApi(nodes, edges, currentFileName ?? undefined);
  }, [exportOpenApi, nodes, edges, currentFileName]);

  const handleImportJson = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importFromJson(file);
    // Reset so the same file can be re-imported if needed
    e.target.value = '';
  }, [importFromJson]);

  const handleSaveAs = useCallback(() => {
    setSaveAsMode(true);
    setNeedsNamePrompt(true);
  }, [setNeedsNamePrompt]);

  const handleNameSave = useCallback((name: string) => {
    if (saveAsMode) {
      saveAsFile(name);
    } else {
      saveFile(name);
    }
    setSaveAsMode(false);
  }, [saveAsMode, saveFile, saveAsFile]);

  const handleNameCancel = useCallback(() => {
    setNeedsNamePrompt(false);
    setSaveAsMode(false);
  }, [setNeedsNamePrompt]);

  const editItems: MenuItem[] = [
    { label: 'Undo', shortcut: '⌘Z', action: canUndo ? undo : undefined },
    { label: 'Redo', shortcut: '⌘Y', action: canRedo ? redo : undefined },
  ];

  const recentSubmenu: MenuItem[] = files.length > 0
    ? files.map((f) => ({
        label: f.name,
        meta: formatDate(f.updatedAt),
        action: () => loadFile(f.id),
      }))
    : [{ label: 'No saved files' }];

  const fileItems: MenuItem[] = [
    { label: 'New Canvas',   action: newCanvas },
    { separator: true },
    { label: 'Save',         shortcut: '⌘S', action: saveToStorage },
    { label: 'Save As…',     action: handleSaveAs },
    { label: 'Open Recent',  submenu: recentSubmenu },
    { separator: true },
    { label: 'Export PNG',     shortcut: '⌘E', action: exportPng },
    { label: 'Export JSON',    action: handleExportJson },
    { label: 'Export OpenAPI', action: handleExportOpenApi },
    { separator: true },
    { label: 'View API Reference', action: () => setShowApiRef(true) },
    { separator: true },
    { label: 'Import JSON',   action: handleImportJson },
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
    <>
      <header style={{
        height: 36,
        background: 'var(--color-toolbar-bg)',
        borderBottom: '1px solid var(--color-node-border)',
        display: 'flex', alignItems: 'center',
        padding: '0 12px', gap: 2,
        userSelect: 'none',
      }}>
        {/* App name */}
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: 'var(--color-node-border)',
          letterSpacing: '0.14em', textTransform: 'uppercase',
          marginRight: 8,
        }}>
          Blueprint
        </span>

        <div style={{ width: 1, height: 14, background: 'var(--color-node-border)', opacity: 0.2, marginRight: 4 }} />

        <Menu label="File"   items={fileItems}   openMenu={openMenu} setOpenMenu={setOpenMenu} />
        <Menu label="Edit"   items={editItems}   openMenu={openMenu} setOpenMenu={setOpenMenu} />
        <Menu label="Window" items={windowItems} openMenu={openMenu} setOpenMenu={setOpenMenu} />

        {/* Current file name */}
        {currentFileName && (
          <span style={{
            marginLeft: 12,
            fontSize: 12,
            color: 'var(--color-toolbar-text)',
            opacity: 0.55,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 200,
          }}>
            {currentFileName}
          </span>
        )}
      </header>

      {/* Name prompt modal */}
      {needsNamePrompt && (
        <NamePrompt
          initial={currentFileName ?? ''}
          onSave={handleNameSave}
          onCancel={handleNameCancel}
        />
      )}

      {/* Hidden file input for JSON import */}
      <input
        ref={importInputRef}
        type="file"
        accept=".json,.blueprint.json"
        style={{ display: 'none' }}
        onChange={handleImportFileChange}
      />

      {/* API Reference modal */}
      {showApiRef && (
        <ApiReferenceModal
          onClose={() => setShowApiRef(false)}
          nodes={nodes}
          edges={edges}
        />
      )}
    </>
  );
}
