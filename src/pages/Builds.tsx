import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { RatingBars } from '../components/RatingBars';
import { useProfileStore } from '../stores/profile';
import { useBuildsStore } from '../stores/builds';
import { calculateComboRatings, type Database } from '../utils/data';
import { compressBuild } from '../utils/links';
import { useTranslation } from '../i18n';
import type { Build } from '../types';

export function BuildCard({
  build,
  database,
  onEdit,
  onDuplicate,
  onShare,
  onDelete,
}: {
  build: Build;
  database: Database | null;
  onEdit: () => void;
  onDuplicate: () => void;
  onShare: () => void;
  onDelete?: () => void;
}) {
  const { t } = useTranslation();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const ratings = database
    ? calculateComboRatings(database, build)
    : { attack: 0, defense: 0, stamina: 0, balance: 0 };

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{build.name}</h3>
          {build.note && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{build.note}</p>
          )}
        </div>
        <RatingBars ratings={ratings} size="sm" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-md bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
        >
          {t('profile.edit')}
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          {t('profile.duplicate')}
        </button>
        <button
          type="button"
          onClick={onShare}
          className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          {t('profile.share')}
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-md bg-red-100 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
          >
            {t('profile.delete')}
          </button>
        )}
      </div>

      {confirmDelete && onDelete && (
        <div className="mt-4 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-300">
            {t('profile.deleteConfirm', { name: build.name })}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                onDelete();
                setConfirmDelete(false);
              }}
              className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
            >
              {t('profile.confirm')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-md bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              {t('profile.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Builds() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { database } = useData();
  const { status, profile } = useProfileStore();
  const { builds, addBuild, deleteBuild, duplicateBuild } = useBuildsStore();
  const [message, setMessage] = useState('');

  const profileBuilds = status === 'unlocked' ? (profile?.builds ?? []) : [];
  const localIds = new Set(builds.map((b) => b.id));
  const visibleProfileBuilds = profileBuilds.filter((b) => !localIds.has(b.id));

  const flash = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleShare = async (build: Build) => {
    const compressed = compressBuild(build);
    const url = `${window.location.origin}${window.location.pathname}#/view/${compressed}`;
    await navigator.clipboard.writeText(url);
    flash(t('profile.shareCopied'));
  };

  /** Profile builds are read-only; editing/duplicating creates a local draft. */
  const copyToDrafts = (build: Build, openInBuilder: boolean) => {
    const copy = addBuild({
      name: openInBuilder ? build.name : `${build.name} (Copy)`,
      bladeId: build.bladeId,
      assistBladeId: build.assistBladeId,
      ratchetId: build.ratchetId,
      bitId: build.bitId,
      note: build.note,
    });
    if (openInBuilder) {
      navigate(`/builder?edit=${copy.id}`);
    } else {
      flash(t('builds.copiedToDrafts'));
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t('builds.title')}</h1>

      {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}

      <section>
        <h2 className="mb-2 text-lg font-semibold">{t('builds.profileBuilds')}</h2>
        <p className="mb-4 text-sm text-[var(--muted)]">{t('builds.profileHint')}</p>
        {status !== 'unlocked' ? (
          <p className="text-sm text-[var(--muted)]">{t('builds.unlockHint')}</p>
        ) : visibleProfileBuilds.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">{t('profile.noBuilds')}</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProfileBuilds.map((build) => (
              <BuildCard
                key={build.id}
                build={build}
                database={database}
                onEdit={() => copyToDrafts(build, true)}
                onDuplicate={() => copyToDrafts(build, false)}
                onShare={() => void handleShare(build)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">{t('builds.localBuilds')}</h2>
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
