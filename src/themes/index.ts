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

// Primary blue used throughout the blueprint theme
// Matches the vivid electric-blue of technical reference diagrams
const BLUE = '#3B4FFF';

export const THEMES: Record<ThemeName, ThemeTokens> = {

  // ── Blueprint ─────────────────────────────────────────────────────────────
  // White canvas, single electric-blue accent — technical diagram aesthetic
  blueprint: {
    'color-canvas-bg':        '#F3F4FF',
    'color-canvas-dot':       'rgba(59,79,255,0.08)',
    'color-canvas-grid-fine': 'rgba(59,79,255,0.05)',
    'color-canvas-grid-major':'rgba(59,79,255,0.13)',
    'color-node-bg':          '#FFFFFF',
    'color-node-border':       BLUE,
    'color-node-text':        '#1A2480',   // dark-blue — text stays readable
    'color-node-glow':        'transparent',
    'color-edge-stroke':       BLUE,
    'color-edge-dot':         '#7B8AFF',
    'color-sidebar-bg':       '#E8EAFF',
    'color-sidebar-hover':    'rgba(59,79,255,0.07)',
    'color-toolbar-bg':       '#FFFFFF',
    'color-toolbar-text':     '#1A2480',
    'color-toolbar-btn-hover':'rgba(59,79,255,0.07)',
    'color-selection-ring':    BLUE,
    'color-minimap-bg':       'rgba(232,234,255,0.97)',
    'color-minimap-node':     'rgba(59,79,255,0.3)',
  },

  // ── Dark ──────────────────────────────────────────────────────────────────
  // Pure black canvas, blue accents
  dark: {
    'color-canvas-bg':        '#000000',
    'color-canvas-dot':       'rgba(91,111,255,0.12)',
    'color-canvas-grid-fine': 'rgba(91,111,255,0.07)',
    'color-canvas-grid-major':'rgba(91,111,255,0.14)',
    'color-node-bg':          '#0D0D0D',
    'color-node-border':      '#2A2A3A',
    'color-node-text':        '#FFFFFF',
    'color-node-glow':        'transparent',
    'color-edge-stroke':      '#5B6FFF',
    'color-edge-dot':         '#8898FF',
    'color-sidebar-bg':       '#050505',
    'color-sidebar-hover':    'rgba(91,111,255,0.09)',
    'color-toolbar-bg':       '#050505',
    'color-toolbar-text':     '#FFFFFF',
    'color-toolbar-btn-hover':'rgba(91,111,255,0.09)',
    'color-selection-ring':   '#5B6FFF',
    'color-minimap-bg':       'rgba(5,5,5,0.98)',
    'color-minimap-node':     'rgba(91,111,255,0.45)',
  },

  // ── Light ─────────────────────────────────────────────────────────────────
  // Warm off-white, softer blue tones
  light: {
    'color-canvas-bg':        '#FAFAF8',
    'color-canvas-dot':       'rgba(0,0,0,0.07)',
    'color-canvas-grid-fine': 'rgba(0,0,0,0.04)',
    'color-canvas-grid-major':'rgba(0,0,0,0.09)',
    'color-node-bg':          '#FFFFFF',
    'color-node-border':      '#C8CADC',
    'color-node-text':        '#1A1A2E',
    'color-node-glow':        'transparent',
    'color-edge-stroke':      '#6B7FFF',
    'color-edge-dot':         '#96A2FF',
    'color-sidebar-bg':       '#F0F0F8',
    'color-sidebar-hover':    'rgba(0,0,0,0.04)',
    'color-toolbar-bg':       '#FFFFFF',
    'color-toolbar-text':     '#1A1A2E',
    'color-toolbar-btn-hover':'rgba(0,0,0,0.05)',
    'color-selection-ring':   '#6B7FFF',
    'color-minimap-bg':       'rgba(240,240,248,0.97)',
    'color-minimap-node':     'rgba(107,127,255,0.35)',
  },
};
