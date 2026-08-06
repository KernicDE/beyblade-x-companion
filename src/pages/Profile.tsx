import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { RatingBars } from '../components/RatingBars';
import { useProfileStore } from '../stores/profile';
import { useBuildsStore } from '../stores/builds';
import { calculateComboRatings } from '../utils/data';
import { compressBuild, compressProfile } from '../utils/links';
import { useTranslation } from '../i18n';

export function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { database } = useData();
  const { status, profile, remembered, lock, forgetDevice } = useProfileStore();
  const { builds, deleteBuild, duplicateBuild } = useBuildsStore();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState('');

  const handleShare = async (buildId: string) => {
    const build = builds.find((c) => c.id === buildId);
    if (!build) return;
    const compressed = compressBuild(build);
    const url = `${window.location.origin}${window.location.pathname}#/view/${compressed}`;
    await navigator.clipboard.writeText(url);
    setExportMessage(t('profile.shareCopied'));
    setTimeout(() => setExportMessage(''), 3000);
  };

  const handleExport = async () => {
    const compressed = compressProfile({
      version: 2,
      username: profile?.username,
      builds,
    });
    const url = `${window.location.origin}${window.location.pathname}#/import?d=${compressed}`;
    await navigator.clipboard.writeText(url);
    setExportMessage(t('profile.exportCopied'));
    setTimeout(() => setExportMessage(''), 3000);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{t('profile.title')}</h1>
          {profile?.username && <p className="text-sm text-[var(--muted)]">{profile.username}</p>}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
          >
            {t('profile.exportProfile')}
          </button>
          {status === 'unlocked' && (
            <button
              type="button"
              onClick={lock}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
            >
              {t('profile.lock')}
            </button>
          )}
        </div>
      </div>

      {remembered && (
        <div className="flex flex-col gap-2 rounded-xl bg-[var(--surface)] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--muted)]">{t('profile.rememberedHint')}</p>
          <button
            type="button"
            onClick={forgetDevice}
            className="rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
          >
            {t('profile.forgetDevice')}
          </button>
        </div>
      )}

      {exportMessage && (
        <p className="text-sm text-green-600 dark:text-green-400">{exportMessage}</p>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold">{t('profile.builds')}</h2>
        <p className="mb-4 text-sm text-[var(--muted)]">{t('profile.draftsHint')}</p>
        {builds.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">{t('profile.noBuilds')}</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {builds.map((build) => {
              const ratings = database
                ? calculateComboRatings(database, build)
                : { attack: 0, defense: 0, stamina: 0, balance: 0 };

              return (
                <div key={build.id} className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-semibold text-gray-900 dark:text-gray-100">{build.name}</h2>
                      {build.note && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{build.note}</p>
                      )}
                    </div>
                    <RatingBars ratings={ratings} size="sm" />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/configurator?edit=${build.id}`)}
                      className="rounded-md bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                    >
                      {t('profile.edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicateBuild(build.id)}
                      className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      {t('profile.duplicate')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShare(build.id)}
                      className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      {t('profile.share')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(build.id)}
                      className="rounded-md bg-red-100 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                    >
                      {t('profile.delete')}
                    </button>
                  </div>

                  {confirmDelete === build.id && (
                    <div className="mt-4 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
                      <p className="text-sm text-red-800 dark:text-red-300">
                        {t('profile.deleteConfirm', { name: build.name })}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            deleteBuild(build.id);
                            setConfirmDelete(null);
                          }}
                          className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                        >
                          {t('profile.confirm')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          className="rounded-md bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                        >
                          {t('profile.cancel')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
