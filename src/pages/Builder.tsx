import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { PartPicker } from '../components/PartPicker';
import { PartIcon } from '../components/PartIcon';
import { RadarChart } from '../components/RadarChart';
import { RatingBars } from '../components/RatingBars';
import { useConfiguratorStore } from '../stores/configurator';
import { useCollectionStore } from '../stores/collection';
import { useBuildsStore } from '../stores/builds';
import { calculateComboRatings, findBeysContainingPart, isComboEstimated } from '../utils/data';
import { useTranslation } from '../i18n';
import { DeckBuilder } from './DeckBuilder';
import type { Part } from '../types';

export function Builder() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'deck' ? 'deck' : 'builder';

  const selectTab = (next: 'builder' | 'deck') => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next === 'deck') {
        params.set('tab', 'deck');
      } else {
        params.delete('tab');
      }
      return params;
    });
  };

  return (
    <div className="space-y-6">
      <div role="tablist" className="flex gap-2 border-b border-gray-200 dark:border-slate-700">
        {(['builder', 'deck'] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => selectTab(key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-[var(--muted)] hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            {t(`builder.tabs.${key}`)}
          </button>
        ))}
      </div>
      {tab === 'deck' ? <DeckBuilder /> : <BuilderTab />}
    </div>
  );
}

function BuilderTab() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { database, loading, error } = useData();
  const {
    bladeId,
    assistBladeId,
    ratchetId,
    bitId,
    setBlade,
    setAssistBlade,
    setRatchet,
    setBit,
    loadCombo,
  } = useConfiguratorStore();
  const { add, update, builds } = useBuildsStore();
  const { ownedParts, fetch: fetchCollection } = useCollectionStore();
  const ownedPartIds = useMemo(
    () => ownedParts.map((p) => p.partId),
    [ownedParts]
  );

  useEffect(() => {
    void fetchCollection();
  }, [fetchCollection]);

  const [saveName, setSaveName] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  const editingId = searchParams.get('edit');
  const editingBuild = useMemo(
    () => (editingId ? builds.find((b) => b.id === editingId) : undefined),
    [builds, editingId]
  );

  const missingSources = useMemo(() => {
    if (!database) return [];
    const parts: Part[] = [];
    const blade = database.blades.find((p) => p.id === bladeId);
    const assistBlade = database.assistBlades.find((p) => p.id === assistBladeId);
    const ratchet = database.ratchets.find((p) => p.id === ratchetId);
    const bit = database.bits.find((p) => p.id === bitId);
    if (blade && !ownedPartIds.includes(blade.id)) parts.push(blade);
    if (assistBlade && !ownedPartIds.includes(assistBlade.id)) parts.push(assistBlade);
    if (ratchet && !ownedPartIds.includes(ratchet.id)) parts.push(ratchet);
    if (bit && !ownedPartIds.includes(bit.id)) parts.push(bit);
    return parts.map((part) => ({
      part,
      beys: findBeysContainingPart(database, part.id).slice(0, 5),
    }));
  }, [database, bladeId, assistBladeId, ratchetId, bitId, ownedPartIds]);

  const loadedEditRef = useRef<string | null>(null);

  useEffect(() => {
    if (!editingId) {
      loadedEditRef.current = null;
      return;
    }
    if (!editingBuild) {
      // Unknown build id: drop the stale edit param and treat as new build.
      loadedEditRef.current = null;
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.delete('edit');
          return params;
        },
        { replace: true }
      );
      return;
    }
    // Load the combo only once per edit target — later store updates
    // (e.g. duplicating or saving other builds) must not reset this session.
    if (loadedEditRef.current === editingId) return;
    loadedEditRef.current = editingId;
    loadCombo({
      bladeId: editingBuild.bladeId,
      assistBladeId: editingBuild.assistBladeId,
      ratchetId: editingBuild.ratchetId,
      bitId: editingBuild.bitId,
    });
    setSaveName(editingBuild.name);
  }, [editingId, editingBuild, loadCombo, setSearchParams]);

  const selectedParts = useMemo(() => {
    if (!database) return [];
    const result: { part: Part; label: string }[] = [];
    const blade = database.blades.find((p) => p.id === bladeId);
    const assistBlade = database.assistBlades.find((p) => p.id === assistBladeId);
    const ratchet = database.ratchets.find((p) => p.id === ratchetId);
    const bit = database.bits.find((p) => p.id === bitId);
    if (blade) result.push({ part: blade, label: t('beyDetail.blade') });
    if (assistBlade) result.push({ part: assistBlade, label: t('beyDetail.assistBlade') });
    if (ratchet) result.push({ part: ratchet, label: t('beyDetail.ratchet') });
    if (bit) result.push({ part: bit, label: t('beyDetail.bit') });
    return result;
  }, [database, bladeId, assistBladeId, ratchetId, bitId, t]);

  if (loading) return <p className="text-[var(--muted)]">{t('errors.loadingDatabase')}</p>;
  if (error || !database) return <p className="text-red-600">{t('errors.failedDatabase')}</p>;

  const combo = { bladeId, assistBladeId, ratchetId, bitId };
  const ratings = calculateComboRatings(database, combo);
  const estimated = isComboEstimated(database, combo);
  const canSave = bladeId && ratchetId && bitId && saveName.trim();
  const blade = database.blades.find((p) => p.id === bladeId);
  const allowsAssistBlade = blade?.customLine === true;

  const handleSetBlade = (id: string) => {
    setBlade(id);
    const next = database.blades.find((p) => p.id === id);
    if (next && !next.customLine) {
      setAssistBlade(undefined);
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    const data = {
      name: saveName.trim(),
      bladeId,
      assistBladeId,
      ratchetId,
      bitId,
    };

    try {
      if (editingBuild) {
        await update(editingBuild.id, data);
        setSavedMessage(t('configurator.buildUpdated'));
      } else {
        const build = await add(data);
        setSearchParams({ edit: build.id });
        setSavedMessage(t('configurator.buildSaved'));
      }
      setTimeout(() => setSavedMessage(''), 3000);
    } catch {
      setSavedMessage(t('errors.loading'));
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <PartPicker
          category="blade"
          label={t('beyDetail.blade')}
          parts={database.blades}
          selectedId={bladeId}
          onSelect={(id) => id && handleSetBlade(id)}
        />
        {allowsAssistBlade && (
          <PartPicker
            category="assistBlade"
            label={t('beyDetail.assistBlade')}
            parts={database.assistBlades}
            selectedId={assistBladeId}
            onSelect={setAssistBlade}
            allowNone
          />
        )}
        <PartPicker
          category="ratchet"
          label={t('beyDetail.ratchet')}
          parts={database.ratchets}
          selectedId={ratchetId}
          onSelect={(id) => id && setRatchet(id)}
        />
        <PartPicker
          category="bit"
          label={t('beyDetail.bit')}
          parts={database.bits}
          selectedId={bitId}
          onSelect={(id) => id && setBit(id)}
        />
      </div>

      {selectedParts.length > 0 && (
        <div className="space-y-3">
          {selectedParts.map(({ part, label }) => (
            <Link
              key={part.id}
              to={`/parts/${part.category}/${part.id}`}
              className="flex items-center gap-4 rounded-xl bg-[var(--surface)] p-3 shadow-sm transition-colors hover:bg-[var(--surface)]/80"
            >
              {part.imageUrl ? (
                <img
                  src={part.imageUrl}
                  alt=""
                  className={
                    part.category === 'bit'
                      ? 'h-14 w-10 object-contain'
                      : 'h-14 w-14 object-contain'
                  }
                />
              ) : (
                <PartIcon category={part.category} size={56} />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[var(--muted)]">{label}</p>
                <p className="truncate text-sm font-semibold text-[var(--text)]">{part.name}</p>
              </div>
              <div className="w-40 sm:w-48">
                <RatingBars ratings={part.ratings} size="sm" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {missingSources.length > 0 && (
        <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">{t('configurator.missingParts')}</h2>
          <ul className="space-y-2">
            {missingSources.map(({ part, beys }) => (
              <li key={part.id} className="text-sm">
                <Link
                  to={`/parts/${part.category}/${part.id}`}
                  className="font-medium hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {part.name}
                </Link>
                {beys.length > 0 ? (
                  <span className="text-[var(--muted)]">
                    {' '}— {t('configurator.availableIn')}: {beys.map((b) => b.name).join(', ')}
                  </span>
                ) : (
                  <span className="text-[var(--muted)]">{' '}— {t('configurator.noSetFound')}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl bg-[var(--surface)] p-6 shadow-sm transition-colors">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              {estimated ? t('partDetail.estimatedRatings') : t('configurator.resultingRatings')}
            </h2>
          </div>
          <div className="mx-auto w-full max-w-[320px]">
            <RadarChart ratings={ratings} size={320} />
          </div>
          <div className="mx-auto mt-4 w-full max-w-[320px]">
            <RatingBars ratings={ratings} size="md" />
          </div>
          <p className="mt-4 text-sm text-[var(--muted)]">
            {estimated ? t('partDetail.estimatedRatingsDisclaimer') : t('partDetail.ratingsDisclaimer')}
          </p>
        </div>

        <div className="flex h-fit flex-col gap-3 rounded-xl bg-[var(--surface)] p-4 shadow-sm transition-colors">
          <h2 className="text-base font-semibold">
            {editingBuild ? t('configurator.updateBuild') : t('configurator.saveBuild')}
          </h2>
          <div className="flex gap-2">
            <input
              id="build-name"
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder={t('configurator.placeholder')}
              aria-label={t('configurator.name')}
              className="min-w-0 flex-1 rounded-md border border-gray-300 dark:border-slate-600 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {t('configurator.save')}
            </button>
          </div>
          {savedMessage && (
            <p className="text-sm text-green-600">{savedMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
