import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { useTranslation } from '../i18n';

export function UserMenu() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  const isModerator = user.role === 'Council' || user.role === 'Referee';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        className="text-sm font-medium text-[var(--muted)] hover:text-blue-600 dark:hover:text-blue-400"
      >
        {user.username}
      </button>
      {open && (
        <div
          onMouseLeave={() => setOpen(false)}
          className="absolute right-0 z-50 mt-2 w-44 rounded-lg bg-[var(--surface)] py-1 shadow-lg ring-1 ring-black/5 dark:ring-white/10"
        >
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--bg)]"
          >
            {t('nav.profile')}
          </Link>
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--bg)]"
          >
            {t('nav.settings')}
          </Link>
          {isModerator && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--bg)]"
            >
              {t('nav.admin')}
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="block w-full px-4 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--bg)]"
          >
            {t('auth.logout')}
          </button>
        </div>
      )}
    </div>
  );
}
