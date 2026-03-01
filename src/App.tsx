import { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useThemeStore } from './store/useThemeStore';
import { THEMES } from './themes';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Toolbar } from './components/Toolbar/Toolbar';
import { Canvas } from './components/Canvas/Canvas';
import { Toast } from './components/Toast';
import { CollabLayer } from './collab/CollabLayer';
import { COLLAB_ENABLED } from './utils/features';

// ── AppInner ───────────────────────────────────────────────────────────────────

function AppInner() {
  const theme = useThemeStore((s) => s.theme);

  // Inject CSS custom properties on <html> on every theme change.
  useEffect(() => {
    const tokens = THEMES[theme];
    Object.entries(tokens).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--${key}`, value);
    });
  }, [theme]);

  const layout = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
      }}
    >
      <Toolbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <Canvas />
      </div>
      <Toast />
    </div>
  );

  if (!COLLAB_ENABLED) return layout;
  return <CollabLayer>{layout}</CollabLayer>;
}

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  );
}
