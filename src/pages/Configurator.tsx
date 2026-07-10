import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { PartPicker } from '../components/PartPicker';
import { RadarChart } from '../components/RadarChart';
import { RatingBars } from '../components/RatingBars';
import { useConfiguratorStore } from '../stores/configurator';
import { useProfileStore } from '../stores/profile';
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
  const { addCreation, updateCreation, creations, ownedPartIds } = useProfileStore();

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
      const creation = creations.find((c) => c.id === editingId);
      if (creation) {
        loadCombo({
          bladeId: creation.bladeId,
          assistBladeId: creation.assistBladeId,
          ratchetId: creation.ratchetId,
          bitId: creation.bitId,
        });
        setSaveName(creation.name);
      }
    }
  }, [editingId, creations, loadCombo]);

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
      updateCreation(editingId, data);
      setSavedMessage(t('configurator.creationUpdated'));
    } else {
      const creation = addCreation(data);
      setSearchParams({ edit: creation.id });
      setSavedMessage(t('configurator.creationSaved'));
    }

    setTimeout(() => setSavedMessage(''), 3000);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{t('configurator.title')}</h1>
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
          <h2 className="mb-4 text-lg font-semibold">
            {estimated ? t('partDetail.estimatedRatings') : t('configurator.resultingRatings')}
          </h2>
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

        <div className="space-y-4 rounded-xl bg-[var(--surface)] p-6 shadow-sm transition-colors">
          <h2 className="text-lg font-semibold">{t('configurator.saveCreation')}</h2>
          <div className="flex flex-col gap-2">
            <label htmlFor="creation-name" className="text-sm font-medium text-[var(--muted)]">
              {t('configurator.name')}
            </label>
            <input
              id="creation-name"
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder={t('configurator.placeholder')}
              className="rounded-md border border-gray-300 dark:border-slate-600 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {editingId ? t('configurator.updateCreation') : t('configurator.saveCreation')}
          </button>
          {savedMessage && (
            <p className="text-sm text-green-600">{savedMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
