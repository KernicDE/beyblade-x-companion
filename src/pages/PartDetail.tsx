import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useData } from '../hooks/useData';
import { getPartById, findBeysContainingPart } from '../utils/data';
import { RadarChart } from '../components/RadarChart';
import { RatingBars } from '../components/RatingBars';
import { PartIcon } from '../components/PartIcon';
import { ManufacturerBadge } from '../components/ManufacturerBadge';
import { SpinBadge } from '../components/SpinBadge';
import { TierBadge } from '../components/TierBadge';
import { useTranslation } from '../i18n';
import { useProfileStore } from '../stores/profile';
import { useAuthStore } from '../stores/auth';
import { getPart, ratePart } from '../api/client';
import { Comments } from '../components/Comments';
import type { PartCategory, LocalizedString, Ratings } from '../types';
import { calculateTier } from '../utils/data';

function localized(text: LocalizedString, locale: string) {
  return text[(locale as 'en' | 'de')] || text.en;
}

const VALID_CATEGORIES: Array<PartCategory | 'launcher'> = [
  'blade',
  'assistBlade',
  'ratchet',
  'bit',
  'launcher',
];

export function PartDetail() {
  const { t, locale } = useTranslation();
  const { category, id } = useParams<{ category: string; id: string }>();
  const { database, loading, error } = useData();
  const { profile } = useProfileStore();
  const { user } = useAuthStore();
  const [backendRatings, setBackendRatings] = useState<Ratings & { count: number } | null>(null);
  const [userRating, setUserRating] = useState<Ratings | null>(null);
  const [ratingError, setRatingError] = useState<string | null>(null);

  if (loading) return <p className="text-[var(--muted)]">{t('partDetail.loading')}</p>;
  if (error || !database) return <p className="text-red-600">{t('errors.failedDatabase')}</p>;

  if (!category || !VALID_CATEGORIES.includes(category as PartCategory | 'launcher')) {
    return <p className="text-red-600">{t('partDetail.invalidCategory')}</p>;
  }

  if (category === 'launcher') {
    const launcher = database.launchers.find((l) => l.id === id);
    if (!launcher) return <p className="text-red-600">{t('partDetail.launcherNotFound')}</p>;

    return (
      <div className="space-y-6">
        <div className="rounded-xl bg-[var(--surface)] p-6 shadow-sm transition-colors">
          <div className="flex items-center gap-4">
            {launcher.imageUrl ? (
              <img src={launcher.imageUrl} alt="" className="h-24 w-24 rounded-xl object-contain" />
            ) : (
              <PartIcon category="launcher" size={96} />
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{launcher.name}</h1>
                <SpinBadge spin={launcher.spinCapability === 'both' ? 'both' : launcher.spinCapability} size="md" />
              </div>
              {launcher.releaseDate && (
                <p className="text-sm text-[var(--muted)]">{launcher.releaseDate}</p>
              )}
            </div>
          </div>
          <p className="mt-4 text-[var(--text)]">{localized(launcher.assessment, locale)}</p>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <ManufacturerBadge manufacturer={launcher.manufacturer} size="md" />
            <span className="text-[var(--muted)]">·</span>
            <span className="font-medium text-[var(--muted)]">{t('partDetail.spinCapability')}:{` `}</span>
            {launcher.spinCapability === 'both' ? `${t('partDetail.right')} + ${t('partDetail.left')}` : t(`partDetail.${launcher.spinCapability}`)}
          </div>
        </div>
      </div>
    );
  }

  const part = getPartById(database, id ?? '', category as PartCategory);
  if (!part) return <p className="text-red-600">{t('partDetail.partNotFound')}</p>;

  useEffect(() => {
    if (!category || !id) return;
    getPart(category, id)
      .then((data) => {
        setBackendRatings(data.ratings);
        setUserRating(data.userRating || null);
      })
      .catch(() => {});
  }, [category, id]);

  const displayRatings = backendRatings && backendRatings.count > 0
    ? { attack: backendRatings.attack, defense: backendRatings.defense, stamina: backendRatings.stamina, balance: backendRatings.balance }
    : part.ratings;

  const handleRate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!category || !id || !user) return;
    const form = e.currentTarget;
    const values: Ratings = {
      attack: Number(form.attack.value),
      defense: Number(form.defense.value),
      stamina: Number(form.stamina.value),
      balance: Number(form.balance.value),
    };
    setRatingError(null);
    try {
      const data = await ratePart(category, id, values);
      setBackendRatings(data.ratings);
      setUserRating(values);
    } catch (err) {
      setRatingError(err instanceof Error ? err.message : 'Rating failed');
    }
  };

  const owned = profile?.ownedParts.find((p) => p.partId === part.id);
  const obtainedFromBey = owned?.obtainedFrom
    ? database.beys.find((b) => b.id === owned.obtainedFrom)
    : undefined;

  const tier = calculateTier(part.ratings, part.officialStats.typeTag);

  return (
    <div className="space-y-6">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl bg-[var(--surface)] p-6 shadow-sm transition-colors">
          <div className="flex items-center gap-4">
            {part.imageUrl ? (
              <img
                src={part.imageUrl}
                alt=""
                className={
                  part.category === 'bit'
                    ? 'h-32 w-20 rounded-xl object-contain'
                    : 'h-24 w-24 rounded-xl object-contain'
                }
              />
            ) : (
              <PartIcon category={part.category} size={96} />
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{part.name}</h1>
                <TierBadge tier={tier} size="md" />
              </div>
              {part.releaseWave && (
                <p className="text-sm text-[var(--muted)]">
                  {part.officialStats.typeTag ? `${part.officialStats.typeTag} · ` : ''}
                  {part.releaseWave}
                  {part.releaseDate && ` · ${part.releaseDate}`}
                </p>
              )}
            </div>
          </div>

          <p className="text-[var(--text)]">{localized(part.assessment, locale)}</p>

          <div className="space-y-2 text-sm">
            <p><ManufacturerBadge manufacturer={part.manufacturer} size="md" /></p>
            <div className="flex items-center gap-2">
              <span className="text-[var(--muted)]">{t('partDetail.spinDirection')}:</span>
              {part.officialStats.spinDirection ? <SpinBadge spin={part.officialStats.spinDirection} size="md" /> : <span className="text-[var(--muted)]">-</span>}
            </div>
            {part.officialStats.weightGrams && (
              <p className="text-[var(--muted)]">{t('partDetail.weight')}: {part.officialStats.weightGrams}g</p>
            )}
            {part.officialStats.heightMm && (
              <p className="text-[var(--muted)]">{t('partDetail.height')}: {part.officialStats.heightMm}mm</p>
            )}
            {part.officialStats.typeTag && (
              <p className="text-[var(--muted)]">{t('partDetail.type')}: {t(`partDetail.${part.officialStats.typeTag.toLowerCase()}`)}</p>
            )}
            {owned && (
              <span className="mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                {t('partDetail.owned')}
              </span>
            )}
          </div>

          <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold">{t('partDetail.availableInSets')}</h3>
            {(() => {
              const beys = findBeysContainingPart(database, part.id);
              if (beys.length === 0) return <p className="text-sm text-[var(--muted)]">{t('configurator.noSetFound')}</p>;
              return (
                <ul className="space-y-1">
                  {beys.slice(0, 10).map((bey) => (
                    <li key={bey.id}>
                      <Link to={`/beys/${bey.id}`} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
                        {bey.name} ({bey.releaseWave})
                      </Link>
                    </li>
                  ))}
                  {beys.length > 10 && <p className="text-xs text-[var(--muted)]">+{beys.length - 10} weitere</p>}
                </ul>
              );
            })()}
          </div>
        </div>

        <div className="flex flex-col items-center rounded-xl bg-[var(--surface)] p-6 shadow-sm transition-colors">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              {backendRatings && backendRatings.count > 0
                ? t('ratings.community') + ` (${backendRatings.count})`
                : part.ratingsSource === 'estimated'
                  ? t('partDetail.estimatedRatings')
                  : t('partDetail.communityRatings')}
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
              : part.ratingsSource === 'estimated'
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
          <h2 className="mb-4 text-lg font-semibold">{t('partDetail.myCopy')}</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <dl className="space-y-2 text-sm">
              {owned.obtainedFrom && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted)]">{t('collection.obtainedFrom')}</dt>
                  <dd className="text-right">
                    {obtainedFromBey ? obtainedFromBey.name : owned.obtainedFrom}
                  </dd>
                </div>
              )}
              {owned.purchaseDate && (
                <div className="flex justify-between">
                  <dt className="text-[var(--muted)]">{t('collection.purchaseDate')}</dt>
                  <dd>{owned.purchaseDate}</dd>
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

      <Comments targetType="part" targetId={part.id} category={part.category} />
    </div>
  );
}
