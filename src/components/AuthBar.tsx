import { useState } from 'react';
import { useAuthStore } from '../stores/auth';
import { useTranslation } from '../i18n';

export function AuthBar() {
  const { t } = useTranslation();
  const { user, loading, login, register, logout, error, clearError } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpStep, setTotpStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return <span className="text-xs text-[var(--muted)]">…</span>;
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-[var(--muted)]">{user.username}</span>
        <button
          type="button"
          onClick={() => logout()}
          className="rounded-full border border-gray-300 dark:border-slate-600 px-3 py-1 text-xs font-medium text-[var(--muted)] hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          {t('auth.logout')}
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    clearError();
    try {
      if (mode === 'login') {
        await login(username, password, totpStep ? totpCode : undefined);
      } else {
        await register(username, password, email || null);
      }
      setOpen(false);
      setUsername('');
      setPassword('');
      setEmail('');
      setTotpCode('');
      setTotpStep(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (!totpStep && message.toLowerCase().includes('totp')) {
        setTotpStep(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setTotpStep(false);
          setTotpCode('');
          clearError();
        }}
        className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
      >
        {t('auth.login')}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-[var(--surface)] p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold">
              {mode === 'login' ? t('auth.login') : t('auth.register')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium">{t('auth.username')}</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 dark:border-slate-600 bg-[var(--bg)] px-3 py-2 text-sm"
                  required
                  minLength={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">{t('auth.password')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 dark:border-slate-600 bg-[var(--bg)] px-3 py-2 text-sm"
                  required
                  minLength={8}
                />
              </div>
              {totpStep && (
                <div>
                  <label className="block text-sm font-medium">{t('auth.totpCode')}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 dark:border-slate-600 bg-[var(--bg)] px-3 py-2 text-sm"
                    required
                    autoFocus
                    maxLength={6}
                  />
                </div>
              )}
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium">{t('auth.email')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 dark:border-slate-600 bg-[var(--bg)] px-3 py-2 text-sm"
                  />
                </div>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'login' ? 'register' : 'login');
                    clearError();
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {mode === 'login' ? t('auth.createAccount') : t('auth.alreadyHaveAccount')}
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setTotpStep(false);
                      setTotpCode('');
                      clearError();
                    }}
                    className="rounded border border-gray-300 dark:border-slate-600 px-3 py-1.5 text-xs font-medium"
                  >
                    {t('auth.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? '…' : mode === 'login' ? t('auth.login') : t('auth.register')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
