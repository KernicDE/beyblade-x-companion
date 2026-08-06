import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { useProfileStore } from '../stores/profile';
import { useBuildsStore } from '../stores/builds';
import { compressBuild, compressProfile } from '../utils/links';
import { useTranslation } from '../i18n';
import { BuildCard } from './Builds';
import type { Build } from '../types';

export function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { database } = useData();
  const { status, profile, remembered, lock, forgetDevice } = useProfileStore();
  const { builds, deleteBuild, duplicateBuild } = useBuildsStore();
  const [exportMessage, setExportMessage] = useState('');

  const handleShare = async (build: Build) => {
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
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('profile.builds')}</h2>
          <Link
            to="/builds"
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            {t('builds.viewAll')}
          </Link>
        </div>
        <p className="mb-4 text-sm text-[var(--muted)]">{t('profile.draftsHint')}</p>
        {builds.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">{t('profile.noBuilds')}</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {builds.map((build) => (
              <BuildCard
                key={build.id}
                build={build}
                database={database}
                onEdit={() => navigate(`/builder?edit=${build.id}`)}
                onDuplicate={() => duplicateBuild(build.id)}
                onShare={() => void handleShare(build)}
                onDelete={() => deleteBuild(build.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
