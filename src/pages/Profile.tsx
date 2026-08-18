import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { useTranslation } from '../i18n';

export function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/');
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

        <p className="mt-3 text-sm text-[var(--muted)]">Rolle</p>
        <p className="text-[var(--text)]">{user.role}</p>
      </div>

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
