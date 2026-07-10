import { useParams, Link } from 'react-router-dom';
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
import type { PartCategory, LocalizedString } from '../types';
import { calculateTier, buildTypeScores, getPartTypeScores } from '../utils/data';

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
  const { isOwnedPart, toggleOwnedPart } = useProfileStore();

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

  const typeScores = buildTypeScores(database);
  const partScores = getPartTypeScores(typeScores, part.category);
  const tier = calculateTier(part.ratings, part.officialStats.typeTag, partScores);

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
            <button
              type="button"
              onClick={() => toggleOwnedPart(part.id)}
              className={`mt-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                isOwnedPart(part.id)
                  ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {isOwnedPart(part.id) ? t('partDetail.owned') : t('partDetail.markOwned')}
            </button>
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
              {part.ratingsSource === 'estimated'
                ? t('partDetail.estimatedRatings')
                : t('partDetail.communityRatings')}
            </h2>
            <TierBadge tier={tier} />
          </div>
          <div className="w-full max-w-[280px]">
            <RadarChart ratings={part.ratings} size={280} />
          </div>
          <div className="mt-4 w-full max-w-[280px]">
            <RatingBars ratings={part.ratings} size="md" />
          </div>
          <p className="mt-4 text-xs text-[var(--muted)]">
            {part.ratingsSource === 'estimated'
              ? t('partDetail.estimatedRatingsDisclaimer')
              : t('partDetail.ratingsDisclaimer')}
          </p>
        </div>
      </div>
    </div>
  );
}
