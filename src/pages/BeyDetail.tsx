import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useData } from '../hooks/useData';
import {
  calculateComboRatings,
  getBeyParts,
  getPartById,
  isComboEstimated,
  calculateTier,
} from '../utils/data';
import { RadarChart } from '../components/RadarChart';
import { RatingBars } from '../components/RatingBars';
import { PartIcon } from '../components/PartIcon';
import { ManufacturerBadge } from '../components/ManufacturerBadge';
import { SpinBadge } from '../components/SpinBadge';
import { TierBadge } from '../components/TierBadge';
import { useTranslation } from '../i18n';
import type { LocalizedString, PartCategory } from '../types';
import { useAuthStore } from '../stores/auth';
import { useCollectionStore } from '../stores/collection';
import { useMatchesStore } from '../stores/matches';
import { getBey, rateBey, getBeyPriceHistory } from '../api/client';
import { recordAgainstBey, recordWithBey } from '../utils/matches';
import { Comments } from '../components/Comments';
import { PriceChart } from '../components/PriceChart';
import type { Ratings } from '../types';

function localized(text: LocalizedString, locale: string) {
  return text[(locale as 'en' | 'de')] || text.en;
}

function localizedList(list: { en: string[]; de: string[] }, locale: string) {
  return list[(locale as 'en' | 'de')] || list.en;
}

export function BeyDetail() {
  const { t, locale } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { database, loading, error } = useData();
  const { user } = useAuthStore();
  const { ownedBeys, fetch: fetchCollection } = useCollectionStore();
  const { matches, fetch: fetchMatches } = useMatchesStore();
  const [backendRatings, setBackendRatings] = useState<Ratings & { count: number } | null>(null);
  const [userRating, setUserRating] = useState<Ratings | null>(null);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [priceHistory, setPriceHistory] = useState<{ date: string; priceEur: number | null; priceChf: number | null; priceUsd: number | null }[]>([]);

  useEffect(() => {
    if (!id) return;
    getBey(id)
      .then((data) => {
        setBackendRatings(data.ratings);
        setUserRating(data.userRating || null);
      })
      .catch(() => {
        // Backend ratings are optional; fall back to calculated ratings.
      });
    getBeyPriceHistory(id)
      .then((data) => setPriceHistory(data.history))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (user) {
      void fetchCollection();
      void fetchMatches();
    }
  }, [user, fetchCollection, fetchMatches]);

  if (loading) return <p className="text-[var(--muted)]">{t('partDetail.loading')}</p>;
  if (error || !database) return <p className="text-red-600">{t('errors.failedDatabase')}</p>;

  const bey = database.beys.find((b) => b.id === id);
  if (!bey) return <p className="text-red-600">{t('beyDetail.beyNotFound')}</p>;

  const parts = getBeyParts(bey);
  const blade = getPartById(database, parts.bladeId, 'blade');
  const assistBlade = parts.assistBladeId
    ? getPartById(database, parts.assistBladeId, 'assistBlade')
    : undefined;
  const ratchet = getPartById(database, parts.ratchetId, 'ratchet');
  const bit = getPartById(database, parts.bitId, 'bit');
  const ratings = calculateComboRatings(database, parts);
  const estimated = isComboEstimated(database, parts);
  const tier = calculateTier(ratings, blade?.officialStats.typeTag);

  const owned = ownedBeys.find((b) => b.beyId === bey.id);
  const recordWith = recordWithBey(matches, bey.id, ownedBeys);
  const recordAgainst = recordAgainstBey(matches, bey.id);

  const partLink = (category: string, partId: string | undefined, label: string) => {
    if (!partId) return null;
    const part = getPartById(database, partId, category as PartCategory);
    const displayName = part ? `${part.name}${part.manufacturer === 'Hasbro' ? ' (H)' : ''}` : partId;
    return (
      <Link
        to={`/parts/${category}/${partId}`}
        className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
      >
        {label}:
        <span className="text-blue-700 dark:text-blue-300">{displayName}</span>
      </Link>
    );
  };

  const typeTag = blade?.officialStats.typeTag;
  const spinDirection = blade?.officialStats.spinDirection;

  const displayRatings = backendRatings && backendRatings.count > 0
    ? { attack: backendRatings.attack, defense: backendRatings.defense, stamina: backendRatings.stamina, balance: backendRatings.balance }
    : ratings;

  const handleRate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id || !user) return;
    const form = e.currentTarget;
    const values: Ratings = {
      attack: Number(form.attack.value),
      defense: Number(form.defense.value),
      stamina: Number(form.stamina.value),
      balance: Number(form.balance.value),
    };
    setRatingError(null);
    try {
      const data = await rateBey(id, values);
      setBackendRatings(data.ratings);
      setUserRating(values);
    } catch (err) {
      setRatingError(err instanceof Error ? err.message : 'Rating failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl bg-[var(--surface)] p-6 shadow-sm transition-colors">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            {bey.imageUrl ? (
              <img src={bey.imageUrl} alt="" className="h-48 w-48 rounded-xl object-contain" />
            ) : (
              <PartIcon category="bey" size={192} />
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{bey.name}</h1>
                <TierBadge tier={tier} size="md" />
              </div>
              <p className="text-sm text-[var(--muted)]">
                {typeTag && <span className="font-medium text-[var(--text)]">{typeTag}</span>}
                {typeTag && ' · '}
                {bey.releaseWave}
                {bey.releaseDate && ` · ${bey.releaseDate}`}
              </p>
            </div>
          </div>

          <p className="text-[var(--text)]">{localized(bey.assessment, locale)}</p>

          {bey.highlights && (
            <div className="space-y-3">
              {(['pro', 'con', 'trivia'] as const).map((section) => (
                <div key={section}>
                  <h3 className="text-sm font-semibold text-[var(--text)]">{t(`beyDetail.${section}`)}</h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--text)]">
                    {localizedList(bey.highlights![section], locale).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 text-sm">
            <p><ManufacturerBadge manufacturer={bey.manufacturer} size="md" /></p>
            <div className="flex items-center gap-2">
              <span className="text-[var(--muted)]">{t('partDetail.spinDirection')}:</span>
              {spinDirection ? <SpinBadge spin={spinDirection} size="md" /> : <span className="text-[var(--muted)]">-</span>}
            </div>
            {owned && (
              <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                {t('beyDetail.owned')}
              </span>
            )}
            <h2 className="font-semibold text-[var(--text)]">{t('beyDetail.parts')}</h2>
            <div className="flex flex-wrap gap-2">
              {blade && partLink('blade', blade.id, t('beyDetail.blade'))}
              {assistBlade && partLink('assistBlade', assistBlade.id, t('beyDetail.assistBlade'))}
              {ratchet && partLink('ratchet', ratchet.id, t('beyDetail.ratchet'))}
              {bit && partLink('bit', bit.id, t('beyDetail.bit'))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center rounded-xl bg-[var(--surface)] p-6 shadow-sm transition-colors">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              {backendRatings && backendRatings.count > 0
                ? t('ratings.community') + ` (${backendRatings.count})`
                : estimated
                  ? t('partDetail.estimatedRatings')
                  : t('beyDetail.communityRatings')}
            </h2>
            <TierBadge tier={tier} />
          </div>
          <div className="w-full max-w-[280px]">
            <RadarChart ratings={displayRatings} size={280} />
          </div>
          <div className="mt-4 w-full max-w-[280px]">
            <RatingBars ratings={displayRatings} size="md" />
          </div>
          <p className="mt-4 text-xs text-[var(--muted)]">
            {backendRatings && backendRatings.count > 0
              ? t('ratings.count', { count: backendRatings.count })
              : estimated
                ? t('partDetail.estimatedRatingsDisclaimer')
                : t('partDetail.ratingsDisclaimer')}
          </p>

          {user && (
            <form onSubmit={handleRate} className="mt-6 w-full max-w-[280px] space-y-2">
              <p className="text-sm font-medium">{t('ratings.yourRating')}</p>
              <div className="grid grid-cols-2 gap-2">
                {(['attack', 'defense', 'stamina', 'balance'] as const).map((dim) => (
                  <label key={dim} className="block text-xs">
                    {t(`ratings.${dim}`)}
                    <input
                      type="number"
                      name={dim}
                      min="0"
                      max="5"
                      step="1"
                      defaultValue={userRating?.[dim] ?? displayRatings[dim]}
                      className="mt-1 w-full rounded border border-gray-300 dark:border-slate-600 bg-[var(--bg)] px-2 py-1"
                    />
                  </label>
                ))}
              </div>
              {ratingError && <p className="text-xs text-red-600">{ratingError}</p>}
              <button
                type="submit"
                className="w-full rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                {t('ratings.submit')}
              </button>
            </form>
          )}
        </div>
      </div>

      {owned && (
        <section className="rounded-xl bg-[var(--surface)] p-6 shadow-sm transition-colors">
          <h2 className="mb-4 text-lg font-semibold">{t('beyDetail.myCopy')}</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <dl className="space-y-2 text-sm">
              {owned.purchaseDate && (
                <div className="flex justify-between">
                  <dt className="text-[var(--muted)]">{t('collection.purchaseDate')}</dt>
                  <dd>{owned.purchaseDate}</dd>
                </div>
              )}
              {owned.shop && (
                <div className="flex justify-between">
                  <dt className="text-[var(--muted)]">{t('collection.shop')}</dt>
                  <dd>{owned.shop}</dd>
                </div>
              )}
              {owned.priceEur != null && (
                <div className="flex justify-between">
                  <dt className="text-[var(--muted)]">{t('collection.price')}</dt>
                  <dd>
                    €{owned.priceEur.toFixed(2)}
                    {owned.priceChf != null && ` (CHF ${owned.priceChf.toFixed(2)})`}
                  </dd>
                </div>
              )}
              {owned.setName && (
                <div className="flex justify-between">
                  <dt className="text-[var(--muted)]">{t('collection.set')}</dt>
                  <dd>{owned.setName}</dd>
                </div>
              )}
              {owned.note && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">{t('collection.note')}</dt>
                  <dd className="text-right">{owned.note}</dd>
                </div>
              )}
            </dl>
          </div>
        </section>
      )}

      {recordWith && recordAgainst && (recordWith.matches > 0 || recordAgainst.matches > 0) && (
        <section className="rounded-xl bg-[var(--surface)] p-6 shadow-sm transition-colors">
          <h2 className="mb-4 text-lg font-semibold">{t('beyDetail.myRecord')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {recordWith.matches > 0 && (
              <div className="rounded-lg bg-[var(--muted)]/5 p-4">
                <p className="text-sm text-[var(--muted)]">{t('beyDetail.recordWith')}</p>
                <p className="text-xl font-bold">{recordWith.wins}-{recordWith.losses}</p>
                <p className="text-xs text-[var(--muted)]">
                  {Math.round(recordWith.winRate * 100)}% {t('matches.winRate')}
                </p>
              </div>
            )}
            {recordAgainst.matches > 0 && (
              <div className="rounded-lg bg-[var(--muted)]/5 p-4">
                <p className="text-sm text-[var(--muted)]">{t('beyDetail.recordAgainst')}</p>
                <p className="text-xl font-bold">{recordAgainst.wins}-{recordAgainst.losses}</p>
                <p className="text-xs text-[var(--muted)]">
                  {Math.round(recordAgainst.winRate * 100)}% {t('matches.winRate')}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="rounded-xl bg-[var(--surface)] p-6 shadow-sm transition-colors">
        <h2 className="mb-4 text-lg font-semibold">{t('beyDetail.priceHistory')}</h2>
        <PriceChart history={priceHistory} currency="EUR" />
      </section>

      {bey && <Comments targetType="bey" targetId={bey.id} />}
    </div>
  );
}
