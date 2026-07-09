import { useParams, Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { calculateComboRatings, getBeyParts, getPartById } from '../utils/data';
import { RadarChart } from '../components/RadarChart';
import { PartIcon } from '../components/PartIcon';
import { ManufacturerBadge } from '../components/ManufacturerBadge';
import { useTranslation } from '../i18n';

export function BeyDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { database, loading, error } = useData();

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

  const partLink = (category: string, partId: string | undefined, label: string) => {
    if (!partId) return null;
    return (
      <Link
        to={`/parts/${category}/${partId}`}
        className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
      >
        {label}:
        <span className="text-blue-700 dark:text-blue-300">{partId}</span>
      </Link>
    );
  };

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
              <h1 className="text-2xl font-bold">{bey.name}</h1>
              <p className="text-sm text-[var(--muted)]">
                {bey.releaseWave}
                {bey.releaseDate && ` · ${bey.releaseDate}`}
              </p>
            </div>
          </div>

          <p className="text-[var(--text)]">{bey.assessment}</p>

          <div className="space-y-2 text-sm">
            <p><ManufacturerBadge manufacturer={bey.manufacturer} size="md" /></p>
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
          <h2 className="mb-4 text-lg font-semibold">{t('beyDetail.communityRatings')}</h2>
          <RadarChart ratings={ratings} size={280} />
          <p className="mt-4 text-xs text-[var(--muted)]">
            {t('partDetail.attack')} {ratings.attack} · {t('partDetail.defense')} {ratings.defense} · {t('partDetail.stamina')} {ratings.stamina} · {t('partDetail.balance')} {ratings.balance}
          </p>
        </div>
      </div>
    </div>
  );
}
