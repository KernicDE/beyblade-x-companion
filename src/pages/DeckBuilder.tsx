import { useMemo, useState } from 'react';
import { useData } from '../hooks/useData';
import { useProfileStore } from '../stores/profile';
import { useBuildsStore } from '../stores/builds';
import { useTranslation } from '../i18n';
import { UnlockGate } from '../components/UnlockGate';
import { PartIcon } from '../components/PartIcon';
import { RatingBars } from '../components/RatingBars';
import { TierBadge } from '../components/TierBadge';
import { buildDecks, scoreCombo, type Deck, type DeckFocus } from '../utils/deck';
import type { PartCategory, Part } from '../types';

const FOCUS_OPTIONS: { value: DeckFocus; labelKey: string }[] = [
  { value: 'auto', labelKey: 'deckBuilder.focus.auto' },
  { value: 'attack', labelKey: 'deckBuilder.focus.attack' },
  { value: 'defense', labelKey: 'deckBuilder.focus.defense' },
  { value: 'stamina', labelKey: 'deckBuilder.focus.stamina' },
];

function SlotFocusSelect({
  slot,
  value,
  disabled,
  onChange,
}: {
  slot: number;
  value: DeckFocus;
  disabled?: boolean;
  onChange: (value: DeckFocus) => void;
}) {
  const { t } = useTranslation();
  return (
    <label className={`flex items-center gap-2 ${disabled ? 'opacity-50' : ''}`}>
      <span className="text-sm text-[var(--muted)]">{t('deckBuilder.focus.slot', { slot })}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as DeckFocus)}
        className="rounded-md border border-gray-300 dark:border-slate-600 bg-[var(--surface)] px-2 py-1 text-sm text-[var(--text)] focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed"
      >
        {FOCUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {t(opt.labelKey)}
          </option>
        ))}
      </select>
    </label>
  );
}

function PartTile({
  part,
  category,
  label,
}: {
  part: { name: string; imageUrl?: string; ratings?: { attack: number; defense: number; stamina: number; balance: number } } | undefined;
  category: PartCategory;
  label: string;
}) {
  if (!part) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--muted)]/20 bg-[var(--bg)] p-2">
      {part.imageUrl ? (
        <img
          src={part.imageUrl}
          alt=""
          className={category === 'bit' ? 'h-8 w-5 object-contain' : 'h-8 w-8 object-contain'}
        />
      ) : (
        <PartIcon category={category} size={32} />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase text-[var(--muted)]">{label}</p>
        <p className="truncate text-xs font-medium text-[var(--text)]">{part.name}</p>
      </div>
      {part.ratings && <RatingBars ratings={part.ratings} size="sm" />}
    </div>
  );
}

function DeckBuilderContent() {
  const { t } = useTranslation();
  const { database, loading, error } = useData();
  const { profile } = useProfileStore();
  const { addBuild } = useBuildsStore();
  // Keyed by deck content fingerprint, so the "saved" mark never points at a
  // different deck after focus/profile/database changes.
  const [savedDecks, setSavedDecks] = useState<Set<string>>(new Set());
  const [slotFocuses, setSlotFocuses] = useState<[DeckFocus, DeckFocus, DeckFocus]>([
    'auto',
    'auto',
    'auto',
  ]);

  const deckKey = (deck: Deck) =>
    deck.beys
      .map(
        (b) =>
          `${b.combo.bladeId}/${b.combo.assistBladeId ?? ''}/${b.combo.ratchetId}/${b.combo.bitId}`
      )
      .join('|');

  const setSlotFocus = (index: number, focus: DeckFocus) => {
    setSlotFocuses((prev) => {
      const next: [DeckFocus, DeckFocus, DeckFocus] = [...prev] as [DeckFocus, DeckFocus, DeckFocus];
      next[index] = focus;
      // if a slot loses focus (auto), clear dependent slots
      for (let i = index + 1; i < 3; i++) {
        next[i] = 'auto';
      }
      return next;
    });
  };

  const slot2Disabled = slotFocuses[0] === 'auto';
  const slot3Disabled = slotFocuses[0] === 'auto' || slotFocuses[1] === 'auto';

  const partsById = useMemo(() => {
    if (!database) return new Map<string, Part>();
    const map = new Map<string, Part>();
    [...database.blades, ...database.assistBlades, ...database.ratchets, ...database.bits].forEach(
      (p) => map.set(p.id, p)
    );
    return map;
  }, [database]);

  const decks = useMemo(() => {
    if (!database || !profile) return [];
    return buildDecks(database, profile.ownedParts, slotFocuses, 3, 100);
  }, [database, profile, slotFocuses]);

  const handleSaveDeck = (deck: Deck, index: number) => {
    deck.beys.forEach((bey) => {
      addBuild({
        name: `${t('deckBuilder.deckName', { n: index + 1 })} – ${bey.bladeName}`,
        bladeId: bey.combo.bladeId,
        assistBladeId: bey.combo.assistBladeId,
        ratchetId: bey.combo.ratchetId,
        bitId: bey.combo.bitId,
      });
    });
    setSavedDecks((prev) => new Set(prev).add(deckKey(deck)));
  };

  if (loading) return <p className="text-[var(--muted)]">{t('errors.loadingDatabase')}</p>;
  if (error || !database) return <p className="text-red-600">{t('errors.failedDatabase')}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex flex-wrap items-center gap-3">
          <SlotFocusSelect
            slot={1}
            value={slotFocuses[0]}
            onChange={(value) => setSlotFocus(0, value)}
          />
          <SlotFocusSelect
            slot={2}
            value={slotFocuses[1]}
            disabled={slot2Disabled}
            onChange={(value) => setSlotFocus(1, value)}
          />
          <SlotFocusSelect
            slot={3}
            value={slotFocuses[2]}
            disabled={slot3Disabled}
            onChange={(value) => setSlotFocus(2, value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-200">
        {t('deckBuilder.rules')}
      </div>

      {decks.length === 0 && (
        <p className="text-[var(--muted)]">{t('deckBuilder.empty')}</p>
      )}

      <div className="space-y-6">
        {decks.map((deck, index) => (
          <div
            key={index}
            className="rounded-xl bg-[var(--surface)] p-4 shadow-sm transition-colors sm:p-6"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm text-[var(--muted)]">{t('deckBuilder.deckScore')}</p>
                  <p className="text-lg font-bold leading-none">{deck.score.toFixed(1)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-2">
                  {deck.beys.map((bey, i) => (
                    <TierBadge key={i} tier={bey.tier} size="sm" />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveDeck(deck, index)}
                  disabled={savedDecks.has(deckKey(deck))}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {savedDecks.has(deckKey(deck))
                    ? t('deckBuilder.buildsSaved')
                    : t('deckBuilder.saveAsBuilds')}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {deck.beys.map((bey, beyIndex) => {
                const blade = partsById.get(bey.combo.bladeId);
                const assistBlade = bey.combo.assistBladeId
                  ? partsById.get(bey.combo.assistBladeId)
                  : undefined;
                const ratchet = partsById.get(bey.combo.ratchetId);
                const bit = partsById.get(bey.combo.bitId);

                return (
                  <div
                    key={beyIndex}
                    className="rounded-lg border border-[var(--muted)]/10 bg-[var(--bg)] p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase text-[var(--muted)]">
                        {bey.typeTag ?? t('deckBuilder.combo')}
                      </p>
                      <span className="text-xs font-medium text-[var(--text)]">
                        {scoreCombo(bey.ratings, bey.typeTag, slotFocuses[beyIndex]).toFixed(1)}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <PartTile part={blade} category="blade" label={t('beyDetail.blade')} />
                      {assistBlade && (
                        <PartTile
                          part={assistBlade}
                          category="assistBlade"
                          label={t('beyDetail.assistBlade')}
                        />
                      )}
                      <PartTile part={ratchet} category="ratchet" label={t('beyDetail.ratchet')} />
                      <PartTile part={bit} category="bit" label={t('beyDetail.bit')} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DeckBuilder() {
  return (
    <UnlockGate>
      <DeckBuilderContent />
    </UnlockGate>
  );
}
