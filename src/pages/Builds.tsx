import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { PartPicker } from '../components/PartPicker';
import { RatingBars } from '../components/RatingBars';
import { RadarChart } from '../components/RadarChart';
import { useAuthStore } from '../stores/auth';
import { useBuildsStore } from '../stores/builds';
import { calculateComboRatings, isComboEstimated } from '../utils/data';
import { compressBuild } from '../utils/links';
import { useTranslation } from '../i18n';
import type { Build } from '../types';

const EMPTY_DRAFT = {
  name: '',
  note: '',
  bladeId: '',
  assistBladeId: undefined as string | undefined,
  ratchetId: '',
  bitId: '',
  isPublic: false,
};

export function Builds() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { database, loading: dbLoading } = useData();
  const { user } = useAuthStore();
  const { builds, loading, error, fetch, add, update, remove } = useBuildsStore();

  const [draft, setDraft] = useState({ ...EMPTY_DRAFT });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      void fetch();
    }
  }, [user, fetch]);

  const selectedBlade = useMemo(
    () => database?.blades.find((p) => p.id === draft.bladeId),
    [database, draft.bladeId]
  );
  const allowsAssistBlade = selectedBlade?.customLine === true;

  const combo = useMemo(
    () => ({
      bladeId: draft.bladeId,
      assistBladeId: draft.assistBladeId,
      ratchetId: draft.ratchetId,
      bitId: draft.bitId,
    }),
    [draft]
  );
  const ratings = database ? calculateComboRatings(database, combo) : { attack: 0, defense: 0, stamina: 0, balance: 0 };
  const estimated = database ? isComboEstimated(database, combo) : false;
  const canSave =
    draft.name.trim() && draft.bladeId && draft.ratchetId && draft.bitId;

  const resetForm = () => {
    setDraft({ ...EMPTY_DRAFT });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (build: Build) => {
    setDraft({
      name: build.name,
      note: build.note ?? '',
      bladeId: build.bladeId,
      assistBladeId: build.assistBladeId,
      ratchetId: build.ratchetId,
      bitId: build.bitId,
      isPublic: build.isPublic ?? false,
    });
    setEditingId(build.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!canSave) return;
    const data = {
      name: draft.name.trim(),
      note: draft.note.trim() || undefined,
      bladeId: draft.bladeId,
      assistBladeId: draft.assistBladeId,
      ratchetId: draft.ratchetId,
      bitId: draft.bitId,
      isPublic: draft.isPublic,
    };

    try {
      if (editingId) {
        await update(editingId, data);
        flash(t('configurator.buildUpdated'));
      } else {
        const build = await add(data);
        flash(t('configurator.buildSaved'));
        navigate(`/builder?edit=${build.id}`);
      }
      resetForm();
    } catch {
      // error is already stored in the store
    }
  };

  const flash = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleShare = async (build: Build) => {
    const compressed = compressBuild(build);
    const url = `${window.location.origin}${window.location.pathname}#/view/${compressed}`;
    await navigator.clipboard.writeText(url);
    flash(t('builds.shareCopied'));
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      setDeleteId(null);
    } catch {
      // error stored in store
    }
  };

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t('builds.title')}</h1>
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('builds.title')}</h1>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {t('builds.add')}
          </button>
        )}
      </div>

      {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {showForm && database && (
        <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            {editingId ? t('builds.editBuild') : t('builds.newBuild')}
          </h2>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <PartPicker
              category="blade"
              label={t('beyDetail.blade')}
              parts={database.blades}
              selectedId={draft.bladeId}
              onSelect={(id) => {
                const blade = database.blades.find((p) => p.id === id);
                setDraft((prev) => ({
                  ...prev,
                  bladeId: id ?? '',
                  assistBladeId: blade?.customLine ? prev.assistBladeId : undefined,
                }));
              }}
            />
            {allowsAssistBlade && (
              <PartPicker
                category="assistBlade"
                label={t('beyDetail.assistBlade')}
                parts={database.assistBlades}
                selectedId={draft.assistBladeId}
                onSelect={(id) => setDraft((prev) => ({ ...prev, assistBladeId: id }))}
                allowNone
              />
            )}
            <PartPicker
              category="ratchet"
              label={t('beyDetail.ratchet')}
              parts={database.ratchets}
              selectedId={draft.ratchetId}
              onSelect={(id) => setDraft((prev) => ({ ...prev, ratchetId: id ?? '' }))}
            />
            <PartPicker
              category="bit"
              label={t('beyDetail.bit')}
              parts={database.bits}
              selectedId={draft.bitId}
              onSelect={(id) => setDraft((prev) => ({ ...prev, bitId: id ?? '' }))}
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t('builds.name')}
              aria-label={t('builds.name')}
              className="rounded-md border border-gray-300 dark:border-slate-600 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:border-blue-500 focus:outline-none"
            />
            <input
              type="text"
              value={draft.note}
              onChange={(e) => setDraft((prev) => ({ ...prev, note: e.target.value }))}
              placeholder={t('builds.note')}
              aria-label={t('builds.note')}
              className="rounded-md border border-gray-300 dark:border-slate-600 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="mt-4 flex items-center gap-2">
            <input
              id="build-public"
              type="checkbox"
              checked={draft.isPublic}
              onChange={(e) => setDraft((prev) => ({ ...prev, isPublic: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="build-public" className="text-sm text-[var(--text)]">
              {t('builds.public')}
            </label>
          </div>

          <div className="mt-4 grid gap-8 lg:grid-cols-2">
            <div className="rounded-xl bg-[var(--surface)] p-4">
              <h3 className="mb-2 text-sm font-semibold">
                {estimated ? t('partDetail.estimatedRatings') : t('configurator.resultingRatings')}
              </h3>
              <div className="mx-auto w-full max-w-[240px]">
                <RadarChart ratings={ratings} size={240} />
              </div>
              <div className="mx-auto mt-2 w-full max-w-[240px]">
                <RatingBars ratings={ratings} size="sm" />
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!canSave}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {t('builds.save')}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              {t('builds.cancel')}
            </button>
          </div>
        </div>
      )}

      {loading || dbLoading ? (
        <p className="text-[var(--muted)]">{t('errors.loading')}</p>
      ) : builds.length === 0 ? (
        <p className="text-[var(--muted)]">{t('builds.empty')}</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {builds.map((build) => {
            const buildRatings = database
              ? calculateComboRatings(database, build)
              : { attack: 0, defense: 0, stamina: 0, balance: 0 };
            const parts = database
              ? [
                  database.blades.find((p) => p.id === build.bladeId)?.name,
                  build.assistBladeId
                    ? database.assistBlades.find((p) => p.id === build.assistBladeId)?.name
                    : undefined,
                  database.ratchets.find((p) => p.id === build.ratchetId)?.name,
                  database.bits.find((p) => p.id === build.bitId)?.name,
                ].filter(Boolean)
              : [];

            return (
              <div
                key={build.id}
                className="rounded-xl bg-[var(--surface)] p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-[var(--text)]">{build.name}</h3>
                    {build.note && (
                      <p className="text-sm text-[var(--muted)]">{build.note}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      build.isPublic
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {build.isPublic ? t('builds.public') : t('builds.private')}
                  </span>
                </div>

                <p className="mt-2 text-xs text-[var(--muted)]">
                  {t('builds.parts')}: {parts.join(' · ')}
                </p>

                <div className="mt-3">
                  <RatingBars ratings={buildRatings} size="sm" />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(build)}
                    className="rounded-md bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                  >
                    {t('collection.edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleShare(build)}
                    className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    {t('profile.share')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(build.id)}
                    className="rounded-md bg-red-100 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                  >
                    {t('builds.delete')}
                  </button>
                </div>

                {deleteId === build.id && (
                  <div className="mt-3 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
                    <p className="text-sm text-red-800 dark:text-red-300">
                      {t('builds.deleteConfirm', { name: build.name })}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleDelete(build.id)}
                        className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                      >
                        {t('builds.confirm')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(null)}
                        className="rounded-md bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                      >
                        {t('builds.cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
