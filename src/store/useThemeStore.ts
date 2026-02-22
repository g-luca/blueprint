import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeName } from '../themes';

const CYCLE: ThemeName[] = ['blueprint', 'dark', 'light'];

interface ThemeState {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  cycleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'blueprint',
      setTheme: (t) => set({ theme: t }),
      cycleTheme: () => {
        const current = get().theme;
        const idx = CYCLE.indexOf(current);
        set({ theme: CYCLE[(idx + 1) % CYCLE.length] });
      },
    }),
    { name: 'blueprint-theme' }
  )
);
