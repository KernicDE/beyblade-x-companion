import { useParams } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { RadarChart } from '../components/RadarChart';
import { PartIcon } from '../components/PartIcon';
import { decompressCreation } from '../utils/links';
import { calculateComboRatings, getPartById, isComboEstimated } from '../utils/data';
import { useTranslation } from '../i18n';

export function View() {
  const { t } = useTranslation();
  const { compressed } = useParams<{ compressed: string }>();
  const { database, loading, error } = useData();

  if (loading) return <p className="text-gray-600 dark:text-gray-400">{t('view.loading')}</p>;
  if (error || !database) return <p className="text-red-600 dark:text-red-400">{t('errors.failedDatabase')}</p>;

  const creation = compressed ? decompressCreation(compressed) : null;
  if (!creation) {
    return <p className="text-red-600 dark:text-red-400">{t('view.invalidLink')}</p>;
  }

  const blade = getPartById(database, creation.bladeId, 'blade');
  const assistBlade = creation.assistBladeId
    ? getPartById(database, creation.assistBladeId, 'assistBlade')
    : undefined;
  const ratchet = getPartById(database, creation.ratchetId, 'ratchet');
  const bit = getPartById(database, creation.bitId, 'bit');
  const ratings = calculateComboRatings(database, creation);
  const estimated = isComboEstimated(database, creation);

  return (
    <div className="space-y-6">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex items-center gap-4">
            <PartIcon category="bey" size={96} />
            <div>
              <h1 className="text-2xl font-bold">{creation.name}</h1>
              {creation.note && <p className="text-gray-700 dark:text-gray-300">{creation.note}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold">{t('view.parts')}</h2>
            <ul className="space-y-1 text-sm">
              <li>{t('view.blade')}: {blade?.name ?? 'Unknown'}</li>
              {assistBlade && <li>{t('view.assistBlade')}: {assistBlade.name}</li>}
              <li>{t('view.ratchet')}: {ratchet?.name ?? 'Unknown'}</li>
              <li>{t('view.bit')}: {bit?.name ?? 'Unknown'}</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-semibold">
            {estimated ? t('partDetail.estimatedRatings') : t('view.communityRatings')}
          </h2>
          <RadarChart ratings={ratings} size={280} />
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            {estimated ? t('partDetail.estimatedRatingsDisclaimer') : t('partDetail.ratingsDisclaimer')}
          </p>
        </div>
      </div>
    </div>
  );
}
