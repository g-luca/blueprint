export type ThemeName = 'blueprint' | 'dark' | 'light';

export interface ThemeTokens {
  'color-canvas-bg': string;
  'color-canvas-dot': string;
  'color-canvas-grid-fine': string;
  'color-canvas-grid-major': string;
  'color-node-bg': string;
  'color-node-border': string;
  'color-node-text': string;
  'color-node-glow': string;
  'color-edge-stroke': string;
  'color-edge-dot': string;
  'color-sidebar-bg': string;
  'color-sidebar-hover': string;
  'color-toolbar-bg': string;
  'color-toolbar-text': string;
  'color-toolbar-btn-hover': string;
  'color-selection-ring': string;
  'color-minimap-bg': string;
  'color-minimap-node': string;
}

export const THEMES: Record<ThemeName, ThemeTokens> = {
  blueprint: {
    'color-canvas-bg': '#1a3a8f',
    'color-canvas-dot': 'rgba(255,255,255,0.12)',
    'color-canvas-grid-fine': 'rgba(255,255,255,0.07)',
    'color-canvas-grid-major': 'rgba(255,255,255,0.18)',
    'color-node-bg': 'rgba(10,40,120,0.85)',
    'color-node-border': 'rgba(255,255,255,0.6)',
    'color-node-text': '#e0eeff',
    'color-node-glow': 'rgba(255,255,255,0.15)',
    'color-edge-stroke': 'rgba(255,255,255,0.7)',
    'color-edge-dot': '#7dd3fc',
    'color-sidebar-bg': '#0f2560',
    'color-sidebar-hover': 'rgba(255,255,255,0.08)',
    'color-toolbar-bg': '#0f2560',
    'color-toolbar-text': '#e0eeff',
    'color-toolbar-btn-hover': 'rgba(255,255,255,0.1)',
    'color-selection-ring': '#7dd3fc',
    'color-minimap-bg': 'rgba(15,37,96,0.9)',
    'color-minimap-node': 'rgba(255,255,255,0.4)',
  },
  dark: {
    'color-canvas-bg': '#0a0a0a',
    'color-canvas-dot': 'rgba(255,255,255,0.06)',
    'color-canvas-grid-fine': 'rgba(255,255,255,0.04)',
    'color-canvas-grid-major': 'rgba(255,255,255,0.09)',
    'color-node-bg': '#1c1c1c',
    'color-node-border': '#3f3f46',
    'color-node-text': '#e4e4e7',
    'color-node-glow': 'rgba(99,102,241,0.1)',
    'color-edge-stroke': '#6366f1',
    'color-edge-dot': '#818cf8',
    'color-sidebar-bg': '#111111',
    'color-sidebar-hover': 'rgba(255,255,255,0.05)',
    'color-toolbar-bg': '#111111',
    'color-toolbar-text': '#e4e4e7',
    'color-toolbar-btn-hover': 'rgba(255,255,255,0.08)',
    'color-selection-ring': '#818cf8',
    'color-minimap-bg': 'rgba(17,17,17,0.9)',
    'color-minimap-node': 'rgba(99,102,241,0.5)',
  },
  light: {
    'color-canvas-bg': '#f8fafc',
    'color-canvas-dot': 'rgba(0,0,0,0.12)',
    'color-canvas-grid-fine': 'rgba(0,0,0,0.05)',
    'color-canvas-grid-major': 'rgba(0,0,0,0.12)',
    'color-node-bg': '#ffffff',
    'color-node-border': '#cbd5e1',
    'color-node-text': '#1e293b',
    'color-node-glow': 'rgba(59,130,246,0.1)',
    'color-edge-stroke': '#3b82f6',
    'color-edge-dot': '#60a5fa',
    'color-sidebar-bg': '#f1f5f9',
    'color-sidebar-hover': 'rgba(0,0,0,0.04)',
    'color-toolbar-bg': '#f1f5f9',
    'color-toolbar-text': '#1e293b',
    'color-toolbar-btn-hover': 'rgba(0,0,0,0.06)',
    'color-selection-ring': '#3b82f6',
    'color-minimap-bg': 'rgba(241,245,249,0.95)',
    'color-minimap-node': 'rgba(59,130,246,0.4)',
  },
};
