import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolved: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

function resolve(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      resolved: resolve('system'),
      setTheme: (theme) => {
        set({ theme, resolved: resolve(theme) });
      },
    }),
    {
      name: 'bx-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.resolved = resolve(state.theme);
        }
      },
    }
  )
);

export function initThemeListener() {
  if (typeof window === 'undefined') return;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    const { theme, setTheme } = useThemeStore.getState();
    if (theme === 'system') {
      setTheme('system');
    }
  };
  media.addEventListener('change', handler);
  return () => media.removeEventListener('change', handler);
}
