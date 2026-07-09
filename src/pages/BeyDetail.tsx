import { useParams, Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import {
  calculateComboRatings,
  getBeyParts,
  getPartById,
  isComboEstimated,
  calculateTier,
  buildTypeScores,
} from '../utils/data';
import { RadarChart } from '../components/RadarChart';
import { RatingBars } from '../components/RatingBars';
import { PartIcon } from '../components/PartIcon';
import { ManufacturerBadge } from '../components/ManufacturerBadge';
import { SpinBadge } from '../components/SpinBadge';
import { TierBadge } from '../components/TierBadge';
import { useTranslation } from '../i18n';
import type { LocalizedString, PartCategory } from '../types';

function localized(text: LocalizedString, locale: string) {
  return text[(locale as 'en' | 'de')] || text.en;
}

export function BeyDetail() {
  const { t, locale } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { database, loading, error } = useData();

  if (loading) return <p className="text-[var(--muted)]">{t('partDetail.loading')}</p>;
  if (error || !database) return <p className="text-red-600">{t('errors.failedDatabase')}</p>;

  const bey = database.beys.find((b) => b.id === id);
  if (!bey) return <p className="text-red-600">{t('beyDetail.beyNotFound')}</p>;

  const typeScores = buildTypeScores(database);
  const parts = getBeyParts(bey);
  const blade = getPartById(database, parts.bladeId, 'blade');
  const assistBlade = parts.assistBladeId
    ? getPartById(database, parts.assistBladeId, 'assistBlade')
    : undefined;
  const ratchet = getPartById(database, parts.ratchetId, 'ratchet');
  const bit = getPartById(database, parts.bitId, 'bit');
  const ratings = calculateComboRatings(database, parts);
  const estimated = isComboEstimated(database, parts);
  const tier = calculateTier(ratings, blade?.officialStats.typeTag, typeScores);

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

  return (
    <div className="space-y-6">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl bg-[var(--surface)] p-6 shadow-sm transition-colors">
          <div className="flex items-center gap-4">
            {bey.imageUrl ? (
              <img src={bey.imageUrl} alt="" className="h-24 w-24 rounded-xl object-contain" />
            ) : (
              <PartIcon category="bey" size={96} />
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

          <div className="space-y-2 text-sm">
            <p><ManufacturerBadge manufacturer={bey.manufacturer} size="md" /></p>
            <div className="flex items-center gap-2">
              <span className="text-[var(--muted)]">{t('partDetail.spinDirection')}:</span>
              {spinDirection ? <SpinBadge spin={spinDirection} size="md" /> : <span className="text-[var(--muted)]">-</span>}
            </div>
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
              {estimated ? t('partDetail.estimatedRatings') : t('beyDetail.communityRatings')}
            </h2>
            <TierBadge tier={tier} />
          </div>
          <div className="w-full max-w-[280px]">
            <RadarChart ratings={ratings} size={280} />
          </div>
          <div className="mt-4 w-full max-w-[280px]">
            <RatingBars ratings={ratings} size="md" />
          </div>
          <p className="mt-4 text-xs text-[var(--muted)]">
            {estimated ? t('partDetail.estimatedRatingsDisclaimer') : t('partDetail.ratingsDisclaimer')}
          </p>
        </div>
      </div>
    </div>
  );
}
