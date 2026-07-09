import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { calculateComboRatings, getBeyParts } from '../utils/data';
import { RatingBars } from '../components/RatingBars';
import { PartIcon } from '../components/PartIcon';
import { ManufacturerBadge } from '../components/ManufacturerBadge';
import { ManufacturerFilter } from '../components/ManufacturerFilter';
import { SearchInput } from '../components/SearchInput';
import { useTranslation } from '../i18n';

const MANUFACTURERS = ['Takara Tomy', 'Hasbro'] as const;

export function BeyDatabase() {
  const { t } = useTranslation();
  const { database, loading, error } = useData();
  const [selectedMf, setSelectedMf] = useState<string[]>([...MANUFACTURERS]);
  const [query, setQuery] = useState('');

  if (loading) return <p className="text-[var(--muted)]">{t('errors.loadingDatabase')}</p>;
  if (error || !database) return <p className="text-red-600">{t('errors.failedDatabase')}</p>;

  const q = query.trim().toLowerCase();
  const filteredBeys = database.beys.filter((b) => {
    if (!selectedMf.includes(b.manufacturer)) return false;
    if (!q) return true;
    return (
      b.name.toLowerCase().includes(q) ||
      b.id.toLowerCase().includes(q) ||
      b.releaseWave.toLowerCase().includes(q) ||
      b.manufacturer.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{t('beyDatabase.title')}</h1>
        <ManufacturerFilter selected={selectedMf} onChange={setSelectedMf} />
      </div>
      <SearchInput value={query} onChange={setQuery} />

      {filteredBeys.length === 0 && (
        <p className="text-[var(--muted)]">{t('search.noResults')}</p>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredBeys.map((bey) => {
          const ratings = calculateComboRatings(database, getBeyParts(bey));
          return (
            <Link
              key={bey.id}
              to={`/beys/${bey.id}`}
              className="rounded-xl bg-[var(--surface)] p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                {bey.imageUrl ? (
                  <img src={bey.imageUrl} alt="" className="h-16 w-16 rounded-lg object-contain" />
                ) : (
                  <PartIcon category="bey" size={64} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-[var(--text)]">{bey.name}</h2>
                    <ManufacturerBadge manufacturer={bey.manufacturer} />
                  </div>
                  <p className="text-sm text-[var(--muted)]">{bey.releaseWave}</p>
                  <div className="mt-3">
                    <RatingBars ratings={ratings} />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
