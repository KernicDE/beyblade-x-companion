import { useState, type FormEvent, type ReactNode } from 'react';
import { useProfileStore } from '../stores/profile';
import { useTranslation } from '../i18n';

/**
 * Gates personal pages behind the profile password.
 * Catalog pages stay public; personal data only renders once unlocked.
 */
export function UnlockGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { status, unlock } = useProfileStore();
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [failed, setFailed] = useState(false);

  if (status === 'unlocked') {
    return <>{children}</>;
  }

  if (status === 'loading' || status === 'unlocking') {
    return <p className="text-[var(--muted)]">{t('unlock.loading')}</p>;
  }

  if (status === 'no-profile') {
    return (
      <div className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
        <h1 className="text-xl font-bold">{t('unlock.noProfileTitle')}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{t('unlock.noProfileDesc')}</p>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!password) return;
    const ok = await unlock(password, remember);
    setFailed(!ok);
    if (ok) setPassword('');
  };

  return (
    <div className="mx-auto max-w-sm rounded-xl bg-[var(--surface)] p-6 shadow-sm">
      <h1 className="text-xl font-bold">{t('unlock.title')}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">{t('unlock.desc')}</p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="unlock-password" className="block text-sm font-medium text-[var(--muted)]">
            {t('unlock.password')}
          </label>
          <input
            id="unlock-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="mt-1 w-full rounded-md border border-gray-300 dark:border-slate-600 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:border-blue-500 focus:outline-none"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text)]">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          {t('unlock.remember')}
        </label>
        {failed && <p className="text-sm text-red-600 dark:text-red-400">{t('unlock.wrong')}</p>}
        <button
          type="submit"
          disabled={!password}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {t('unlock.submit')}
        </button>
      </form>
    </div>
  );
}
