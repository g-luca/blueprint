import { Save, FolderOpen, Trash2, Download, Sun, Moon, PenLine } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useExport } from '../../hooks/useExport';
import type { ThemeName } from '../../themes';

const THEME_ICONS: Record<ThemeName, React.ReactNode> = {
  blueprint: <PenLine size={15} />,
  dark: <Moon size={15} />,
  light: <Sun size={15} />,
};

const THEME_LABELS: Record<ThemeName, string> = {
  blueprint: 'Blueprint',
  dark: 'Dark',
  light: 'Light',
};

const NEXT_THEME: Record<ThemeName, ThemeName> = {
  blueprint: 'dark',
  dark: 'light',
  light: 'blueprint',
};

interface ToolbarButtonProps {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}

function ToolbarButton({ onClick, title, children, danger }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        padding: '5px 10px',
        background: 'transparent',
        border: '1px solid var(--color-node-border)',
        borderRadius: '6px',
        color: danger ? '#f87171' : 'var(--color-toolbar-text)',
        fontSize: '12px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background 0.15s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-toolbar-btn-hover)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

export function Toolbar() {
  const { saveToStorage, loadFromStorage, clearCanvas } = useFlowStore();
  const { theme, cycleTheme } = useThemeStore();
  const { exportPng } = useExport();

  const handleClear = () => {
    if (confirm('Clear the canvas? This cannot be undone.')) {
      clearCanvas();
    }
  };

  return (
    <header
      style={{
        height: '44px',
        background: 'var(--color-toolbar-bg)',
        borderBottom: '1px solid var(--color-node-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '0 16px',
      }}
    >
      {/* App name */}
      <span
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: 'var(--color-toolbar-text)',
          marginRight: '12px',
          letterSpacing: '0.04em',
          opacity: 0.9,
        }}
      >
        Blueprint
      </span>

      <div style={{ width: '1px', height: '20px', background: 'var(--color-node-border)' }} />

      <ToolbarButton onClick={saveToStorage} title="Save to localStorage">
        <Save size={14} /> Save
      </ToolbarButton>

      <ToolbarButton onClick={loadFromStorage} title="Load from localStorage">
        <FolderOpen size={14} /> Load
      </ToolbarButton>

      <ToolbarButton onClick={exportPng} title="Export as PNG">
        <Download size={14} /> Export
      </ToolbarButton>

      <ToolbarButton onClick={handleClear} title="Clear canvas" danger>
        <Trash2 size={14} /> Clear
      </ToolbarButton>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Theme toggle */}
      <ToolbarButton
        onClick={cycleTheme}
        title={`Switch to ${THEME_LABELS[NEXT_THEME[theme]]} theme`}
      >
        {THEME_ICONS[theme]}
        {THEME_LABELS[theme]}
      </ToolbarButton>
    </header>
  );
}
