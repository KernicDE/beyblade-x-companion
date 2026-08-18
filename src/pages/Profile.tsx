import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import * as api from '../api/client';
import { useTranslation } from '../i18n';

export function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpLoading, setTotpLoading] = useState(false);
  const [setup, setSetup] = useState<{ secret: string; uri: string; recoveryCodes: string[] } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [totpMessage, setTotpMessage] = useState('');
  const [totpError, setTotpError] = useState('');

  useEffect(() => {
    if (!user) return;
    setTotpLoading(true);
    api
      .getTotpStatus()
      .then((data) => setTotpEnabled(data.enabled))
      .catch(() => {})
      .finally(() => setTotpLoading(false));
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSetup = async () => {
    setTotpError('');
    setTotpMessage('');
    try {
      const data = await api.setupTotp();
      setSetup(data);
    } catch (err) {
      setTotpError(err instanceof Error ? err.message : 'Setup failed');
    }
  };

  const handleVerify = async () => {
    setTotpError('');
    setTotpMessage('');
    try {
      await api.verifyTotpSetup(totpCode);
      setTotpEnabled(true);
      setSetup(null);
      setTotpCode('');
      setTotpMessage(t('profile.totpEnabled'));
    } catch (err) {
      setTotpError(err instanceof Error ? err.message : 'Verification failed');
    }
  };

  const handleDisable = async () => {
    setTotpError('');
    setTotpMessage('');
    try {
      await api.disableTotp(disablePassword);
      setTotpEnabled(false);
      setDisablePassword('');
      setSetup(null);
      setTotpMessage(t('profile.totpDisabled'));
    } catch (err) {
      setTotpError(err instanceof Error ? err.message : 'Disable failed');
    }
  };

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t('profile.title')}</h1>
        <p className="text-[var(--muted)]">{t('builds.loginRequired')}</p>
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t('auth.login')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('profile.title')}</h1>

      <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
        <p className="text-sm text-[var(--muted)]">{t('auth.username')}</p>
        <p className="text-lg font-semibold text-[var(--text)]">{user.username}</p>

        <p className="mt-3 text-sm text-[var(--muted)]">{t('auth.email')}</p>
        <p className="text-[var(--text)]">{user.email ?? '—'}</p>

        <p className="mt-3 text-sm text-[var(--muted)]">{t('profile.role')}</p>
        <p className="text-[var(--text)]">{user.role}</p>
      </div>

      <section className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">{t('profile.totp')}</h2>
        {totpLoading ? (
          <p className="text-sm text-[var(--muted)]">{t('errors.loading')}</p>
        ) : totpEnabled ? (
          <div className="space-y-3">
            <p className="text-sm text-green-600 dark:text-green-400">{t('profile.totpEnabled')}</p>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder={t('auth.password')}
                className="rounded-md border border-gray-300 dark:border-slate-600 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void handleDisable()}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                {t('profile.totpDisable')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[var(--muted)]">{t('profile.totpDisabled')}</p>
            {!setup ? (
              <button
                type="button"
                onClick={() => void handleSetup()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {t('profile.totpSetup')}
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-[var(--muted)]">{t('profile.totpSecret')}</p>
                <code className="block rounded bg-[var(--bg)] p-2 text-sm break-all">{setup.secret}</code>
                <p className="text-sm text-[var(--muted)]">{t('profile.totpUri')}</p>
                <a
                  href={setup.uri}
                  className="block break-all text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  {setup.uri}
                </a>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">{t('profile.totpSaveCodes')}</p>
                <ul className="rounded bg-[var(--bg)] p-2 text-sm">
                  {setup.recoveryCodes.map((code) => (
                    <li key={code} className="font-mono">
                      {code}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder={t('auth.totpCode')}
                    className="rounded-md border border-gray-300 dark:border-slate-600 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void handleVerify()}
                    disabled={totpCode.length !== 6}
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {t('profile.totpVerify')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetup(null)}
                    className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    {t('builds.cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {totpMessage && <p className="text-sm text-green-600 dark:text-green-400">{totpMessage}</p>}
        {totpError && <p className="text-sm text-red-600">{totpError}</p>}
      </section>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          {t('auth.logout')}
        </button>
      </div>
    </div>
  );
}
