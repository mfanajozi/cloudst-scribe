import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'cloudst-theme';

const readTheme = (): Theme =>
  document.documentElement.classList.contains('dark') ? 'dark' : 'light';

/**
 * Theme toggle backed by the inline bootstrap script in index.html.
 * Falls back to the OS preference on first visit.
 */
export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    const apply = (next: Theme) => {
      const root = document.documentElement;
      root.classList.toggle('dark', next === 'dark');
      root.style.colorScheme = next;
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* private-mode — ignore */
      }
    };

    if (theme !== readTheme()) apply(theme);

    // Follow the OS if the user has never picked a theme manually
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      try {
        if (!localStorage.getItem(STORAGE_KEY)) setTheme(e.matches ? 'dark' : 'light');
      } catch {
        /* no-op */
      }
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return { theme, toggleTheme };
};
