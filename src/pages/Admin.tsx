import { useEffect, useState } from 'react';
import { useTranslation } from '../i18n';
import { useAuthStore } from '../stores/auth';
import * as api from '../api/client';
import type { PublicUser, Part, Bey } from '../types';

export function Admin() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [pendingParts, setPendingParts] = useState<Part[]>([]);
  const [pendingBeys, setPendingBeys] = useState<Bey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'catalog'>('users');

  const isCouncil = user?.role === 'Council';
  const isModerator = isCouncil || user?.role === 'Referee';

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'users' && isCouncil) {
        const data = await api.listUsers();
        setUsers(data.users);
      } else if (activeTab === 'catalog' && isModerator) {
        const data = await api.getPendingCatalog();
        setPendingParts(data.parts);
        setPendingBeys(data.beys);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user]);

  if (!user || !isModerator) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t('admin.title')}</h1>
        <p className="text-[var(--muted)]">{t('admin.forbidden')}</p>
      </div>
    );
  }

  const handlePromote = async (id: string) => {
    try {
      const data = await api.promoteUser(id);
      setUsers((prev) => prev.map((u) => (u.id === id ? data.user : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to promote user');
    }
  };

  const handleBan = async (id: string) => {
    const reason = window.prompt(t('admin.banReason'));
    if (!reason) return;
    try {
      const data = await api.banUser(id, reason);
      setUsers((prev) => prev.map((u) => (u.id === id ? data.user : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ban user');
    }
  };

  const handleUnban = async (id: string) => {
    try {
      const data = await api.unbanUser(id);
      setUsers((prev) => prev.map((u) => (u.id === id ? data.user : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unban user');
    }
  };

  const handleRoleChange = async (id: string, role: PublicUser['role']) => {
    try {
      const data = await api.setUserRole(id, role);
      setUsers((prev) => prev.map((u) => (u.id === id ? data.user : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set role');
    }
  };

  const handleCatalogStatus = async (
    type: 'part' | 'bey',
    item: Part | Bey,
    status: 'approved' | 'rejected'
  ) => {
    try {
      if (type === 'part') {
        const part = item as Part;
        await api.updatePartStatus(part.category, part.id, status);
        setPendingParts((prev) => prev.filter((p) => p.id !== part.id));
      } else {
        const bey = item as Bey;
        await api.updateBeyStatus(bey.id, status);
        setPendingBeys((prev) => prev.filter((b) => b.id !== bey.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('admin.title')}</h1>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div role="tablist" className="flex gap-2 border-b border-gray-200 dark:border-slate-700">
        {[
          { key: 'users', label: t('admin.users') },
          { key: 'catalog', label: t('admin.catalog') },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key as 'users' | 'catalog')}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-[var(--muted)] hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-[var(--muted)]">{t('errors.loading')}</p>}

      {activeTab === 'users' && !loading && (
        <div className="overflow-x-auto rounded-xl bg-[var(--surface)] shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--bg)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-2">{t('auth.username')}</th>
                <th className="px-4 py-2">{t('auth.email')}</th>
                <th className="px-4 py-2">{t('profile.role')}</th>
                <th className="px-4 py-2">{t('admin.status')}</th>
                <th className="px-4 py-2">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-[var(--muted)]/10">
                  <td className="px-4 py-2 font-medium">{u.username}</td>
                  <td className="px-4 py-2">{u.email ?? '—'}</td>
                  <td className="px-4 py-2">
                    {isCouncil ? (
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as PublicUser['role'])}
                        className="rounded border border-gray-300 dark:border-slate-600 bg-[var(--surface)] px-2 py-1 text-xs"
                      >
                        {(['Council', 'Referee', 'Blader', 'Rookie Blader'] as const).map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    ) : (
                      u.role
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {u.isBanned ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        {t('admin.banned')}
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        {t('admin.active')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-2">
                      {u.role === 'Rookie Blader' && (
                        <button
                          type="button"
                          onClick={() => void handlePromote(u.id)}
                          className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                        >
                          {t('admin.promote')}
                        </button>
                      )}
                      {u.isBanned ? (
                        <button
                          type="button"
                          onClick={() => void handleUnban(u.id)}
                          className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100"
                        >
                          {t('admin.unban')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleBan(u.id)}
                          className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                        >
                          {t('admin.ban')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'catalog' && !loading && (
        <div className="space-y-8">
          <section>
            <h2 className="mb-2 text-lg font-semibold">{t('partsDatabase.blades')} &amp; {t('partsDatabase.assistBlades')} &amp; {t('partsDatabase.ratchets')} &amp; {t('partsDatabase.bits')}</h2>
            {pendingParts.length === 0 ? (
              <p className="text-[var(--muted)]">{t('admin.noPendingParts')}</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pendingParts.map((part) => (
                  <div key={part.id} className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
                    <p className="font-semibold text-[var(--text)]">{part.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {part.category} · {part.releaseWave ?? '—'}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleCatalogStatus('part', part, 'approved')}
                        className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
                      >
                        {t('admin.approve')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCatalogStatus('part', part, 'rejected')}
                        className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
                      >
                        {t('admin.reject')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">{t('home.links.parts')}</h2>
            {pendingBeys.length === 0 ? (
              <p className="text-[var(--muted)]">{t('admin.noPendingBeys')}</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pendingBeys.map((bey) => (
                  <div key={bey.id} className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
                    <p className="font-semibold text-[var(--text)]">{bey.name}</p>
                    <p className="text-xs text-[var(--muted)]">{bey.releaseWave ?? '—'}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleCatalogStatus('bey', bey, 'approved')}
                        className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
                      >
                        {t('admin.approve')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCatalogStatus('bey', bey, 'rejected')}
                        className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
                      >
                        {t('admin.reject')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
