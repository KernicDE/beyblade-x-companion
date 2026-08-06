import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { PartPicker } from '../components/PartPicker';
import { PartIcon } from '../components/PartIcon';
import { RadarChart } from '../components/RadarChart';
import { RatingBars } from '../components/RatingBars';
import { useConfiguratorStore } from '../stores/configurator';
import { useProfileStore } from '../stores/profile';
import { useBuildsStore } from '../stores/builds';
import { calculateComboRatings, findBeysContainingPart, isComboEstimated } from '../utils/data';
import { useTranslation } from '../i18n';
import type { Part } from '../types';

export function Configurator() {
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
  const { addBuild, updateBuild, builds } = useBuildsStore();
  const { profile } = useProfileStore();
  const ownedPartIds = useMemo(
    () => profile?.ownedParts.map((p) => p.partId) ?? [],
    [profile]
  );

  const [saveName, setSaveName] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [ownedOnly, setOwnedOnly] = useState(false);

  const editingId = searchParams.get('edit');

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

  useEffect(() => {
    if (editingId) {
      const build = builds.find((c) => c.id === editingId);
      if (build) {
        loadCombo({
          bladeId: build.bladeId,
          assistBladeId: build.assistBladeId,
          ratchetId: build.ratchetId,
          bitId: build.bitId,
        });
        setSaveName(build.name);
      }
    }
  }, [editingId, builds, loadCombo]);

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

  const filterParts = (parts: Part[], selectedId?: string) => {
    if (!ownedOnly) return parts;
    return parts.filter((p) => p.id === selectedId || ownedPartIds.includes(p.id));
  };

  const handleSave = () => {
    if (!canSave) return;
    const data = {
      name: saveName.trim(),
      bladeId,
      assistBladeId,
      ratchetId,
      bitId,
    };

    if (editingId) {
      updateBuild(editingId, data);
      setSavedMessage(t('configurator.buildUpdated'));
    } else {
      const build = addBuild(data);
      setSearchParams({ edit: build.id });
      setSavedMessage(t('configurator.buildSaved'));
    }

    setTimeout(() => setSavedMessage(''), 3000);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{t('configurator.title')}</h1>
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--muted)]/30 bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--text)]">
            <input
              type="checkbox"
              checked={ownedOnly}
              onChange={(e) => setOwnedOnly(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            {t('configurator.ownedOnly')}
          </label>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <PartPicker
          category="blade"
          label={t('beyDetail.blade')}
          parts={filterParts(database.blades, bladeId)}
          selectedId={bladeId}
          onSelect={(id) => id && setBlade(id)}
        />
        <PartPicker
          category="assistBlade"
          label={t('beyDetail.assistBlade')}
          parts={filterParts(database.assistBlades, assistBladeId)}
          selectedId={assistBladeId}
          onSelect={setAssistBlade}
          allowNone
        />
        <PartPicker
          category="ratchet"
          label={t('beyDetail.ratchet')}
          parts={filterParts(database.ratchets, ratchetId)}
          selectedId={ratchetId}
          onSelect={(id) => id && setRatchet(id)}
        />
        <PartPicker
          category="bit"
          label={t('beyDetail.bit')}
          parts={filterParts(database.bits, bitId)}
          selectedId={bitId}
          onSelect={(id) => id && setBit(id)}
        />
      </div>

      {selectedParts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {selectedParts.map(({ part, label }) => (
            <div
              key={part.id}
              className="rounded-xl bg-[var(--surface)] p-4 shadow-sm transition-colors"
            >
              <div className="flex items-center gap-3">
                {part.imageUrl ? (
                  <img
                    src={part.imageUrl}
                    alt=""
                    className={
                      part.category === 'bit'
                        ? 'h-16 w-10 object-contain'
                        : 'h-16 w-16 object-contain'
                    }
                  />
                ) : (
                  <PartIcon category={part.category} size={64} />
                )}
                <div className="min-w-0">
                  <p className="text-xs text-[var(--muted)]">{label}</p>
                  <p className="truncate text-sm font-semibold text-[var(--text)]">{part.name}</p>
                </div>
              </div>
              <div className="mt-3">
                <RatingBars ratings={part.ratings} size="sm" />
              </div>
            </div>
          ))}
        </div>
      )}

      {missingSources.length > 0 && (
        <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">{t('configurator.missingParts')}</h2>
          <ul className="space-y-2">
            {missingSources.map(({ part, beys }) => (
              <li key={part.id} className="text-sm">
                <span className="font-medium">{part.name}</span>
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
            {editingId ? t('configurator.updateBuild') : t('configurator.saveBuild')}
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
