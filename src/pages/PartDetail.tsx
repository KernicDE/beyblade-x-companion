import { useParams } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { getPartById } from '../utils/data';
import { RadarChart } from '../components/RadarChart';
import { PartIcon } from '../components/PartIcon';
import { ManufacturerBadge } from '../components/ManufacturerBadge';
import { useTranslation } from '../i18n';
import type { PartCategory } from '../types';

const VALID_CATEGORIES: Array<PartCategory | 'launcher'> = [
  'blade',
  'assistBlade',
  'ratchet',
  'bit',
  'launcher',
];

export function PartDetail() {
  const { t } = useTranslation();
  const { category, id } = useParams<{ category: string; id: string }>();
  const { database, loading, error } = useData();

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
              <img src={launcher.imageUrl} alt="" className="h-24 w-24 rounded-xl object-cover" />
            ) : (
              <PartIcon category="launcher" size={96} />
            )}
            <div>
              <h1 className="text-2xl font-bold">{launcher.name}</h1>
              {launcher.releaseDate && (
                <p className="text-sm text-[var(--muted)]">{launcher.releaseDate}</p>
              )}
            </div>
          </div>
          <p className="mt-4 text-[var(--text)]">{launcher.assessment}</p>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <ManufacturerBadge manufacturer={launcher.manufacturer} size="md" />
            <span className="text-[var(--muted)]">·</span>
            <span className="font-medium text-[var(--muted)]">{t('partDetail.spinCapability')}:{` `}</span>
            {launcher.spinCapability}
          </div>
        </div>
      </div>
    );
  }

  const part = getPartById(database, id ?? '', category as PartCategory);
  if (!part) return <p className="text-red-600">{t('partDetail.partNotFound')}</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl bg-[var(--surface)] p-6 shadow-sm transition-colors">
          <div className="flex items-center gap-4">
            {part.imageUrl ? (
              <img src={part.imageUrl} alt="" className="h-24 w-24 rounded-xl object-cover" />
            ) : (
              <PartIcon category={part.category} size={96} />
            )}
            <div>
              <h1 className="text-2xl font-bold">{part.name}</h1>
              {part.releaseWave && (
                <p className="text-sm text-[var(--muted)]">
                  {part.releaseWave}
                  {part.releaseDate && ` · ${part.releaseDate}`}
                </p>
              )}
            </div>
          </div>

          <p className="text-[var(--text)]">{part.assessment}</p>

          <div className="space-y-2 text-sm">
            <p><ManufacturerBadge manufacturer={part.manufacturer} size="md" /></p>
            {part.officialStats.weightGrams && (
              <p className="text-[var(--muted)]">{t('partDetail.weight')}: {part.officialStats.weightGrams}g</p>
            )}
            {part.officialStats.heightMm && (
              <p className="text-[var(--muted)]">{t('partDetail.height')}: {part.officialStats.heightMm}mm</p>
            )}
            {part.officialStats.spinDirection && (
              <p className="text-[var(--muted)]">{t('partDetail.spinDirection')}: {part.officialStats.spinDirection}</p>
            )}
            {part.officialStats.typeTag && (
              <p className="text-[var(--muted)]">{t('partDetail.type')}: {part.officialStats.typeTag}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center rounded-xl bg-[var(--surface)] p-6 shadow-sm transition-colors">
          <h2 className="mb-4 text-lg font-semibold">{t('partDetail.communityRatings')}</h2>
          <RadarChart ratings={part.ratings} size={280} />
          <p className="mt-4 text-xs text-[var(--muted)]">
            {t('partDetail.ratingsDisclaimer')}
          </p>
        </div>
      </div>
    </div>
  );
}
