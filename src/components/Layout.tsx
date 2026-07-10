import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useThemeStore, initThemeListener } from '../stores/theme';
import { useTranslation } from '../i18n';

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { t, locale, setLocale } = useTranslation();
  const { theme, resolved, setTheme } = useThemeStore();

  useEffect(() => {
    const cleanup = initThemeListener();
    return cleanup;
  }, []);

  useEffect(() => {
    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [resolved]);

  const cycleTheme = () => {
    const order: Array<typeof theme> = ['system', 'light', 'dark'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  };

  const toggleLocale = () => {
    setLocale(locale === 'en' ? 'de' : 'en');
  };

  const themeLabel = t(`theme.${theme === 'system' ? 'auto' : theme}`);

  const nav = [
    { to: '/', label: t('nav.home') },
    { to: '/beys', label: t('nav.beys') },
    { to: '/parts', label: t('nav.parts') },
    { to: '/configurator', label: t('nav.configurator') },
    { to: '/dashboard', label: t('nav.dashboard') },
    { to: '/simulator', label: t('nav.simulator') },
    { to: '/profile', label: t('nav.profile') },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors">
      <header className="bg-[var(--surface)] shadow-sm transition-colors">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link to="/" className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {t('app.title')}
            </Link>
            <nav className="flex flex-wrap items-center gap-4">
              {nav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`text-sm font-medium ${
                    location.pathname === item.to
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-[var(--muted)] hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={cycleTheme}
                className="rounded-full border border-gray-300 dark:border-slate-600 px-3 py-1 text-xs font-medium text-[var(--muted)] hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                title="Toggle theme"
              >
                {themeLabel}
              </button>
              <button
                type="button"
                onClick={toggleLocale}
                className="rounded-full border border-gray-300 dark:border-slate-600 px-3 py-1 text-xs font-medium text-[var(--muted)] hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                title="Toggle language"
              >
                {locale.toUpperCase()}
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

      <footer className="border-t border-gray-200 dark:border-slate-700 bg-[var(--surface)] transition-colors">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-[var(--muted)]">
          {t('footer')}
        </div>
      </footer>
    </div>
  );
}
