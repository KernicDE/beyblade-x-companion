import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import type { Part } from '../types';
import { RatingBars } from '../components/RatingBars';
import { PartIcon } from '../components/PartIcon';
import { ManufacturerBadge } from '../components/ManufacturerBadge';
import { ManufacturerFilter } from '../components/ManufacturerFilter';
import { SearchInput } from '../components/SearchInput';
import { useTranslation } from '../i18n';

const MANUFACTURERS = ['Takara Tomy', 'Hasbro'] as const;

export function PartsDatabase() {
  const { t } = useTranslation();
  const { database, loading, error } = useData();
  const [selectedMf, setSelectedMf] = useState<string[]>([...MANUFACTURERS]);
  const [query, setQuery] = useState('');

  if (loading) return <p className="text-[var(--muted)]">{t('errors.loadingDatabase')}</p>;
  if (error || !database) return <p className="text-red-600">{t('errors.failedDatabase')}</p>;

  const q = query.trim().toLowerCase();
  const matches = (p: { name: string; id: string; releaseWave?: string; manufacturer: string; category?: string }) => {
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      (p.releaseWave?.toLowerCase().includes(q) ?? false) ||
      p.manufacturer.toLowerCase().includes(q) ||
      (p.category?.toLowerCase().includes(q) ?? false)
    );
  };

  const filteredLaunchers = database.launchers.filter((l) => selectedMf.includes(l.manufacturer) && matches(l));

  const groups: { category: Part['category']; titleKey: string; parts: Part[] }[] = [
    { category: 'blade', titleKey: 'partsDatabase.blades', parts: database.blades },
    { category: 'assistBlade', titleKey: 'partsDatabase.assistBlades', parts: database.assistBlades },
    { category: 'ratchet', titleKey: 'partsDatabase.ratchets', parts: database.ratchets },
    { category: 'bit', titleKey: 'partsDatabase.bits', parts: database.bits },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{t('partsDatabase.title')}</h1>
        <ManufacturerFilter selected={selectedMf} onChange={setSelectedMf} />
      </div>
      <SearchInput value={query} onChange={setQuery} />

      {groups.map((group) => {
        const filtered = group.parts.filter((p) => selectedMf.includes(p.manufacturer) && matches(p));
        if (filtered.length === 0) return null;
        return (
          <section key={group.category}>
            <h2 className="mb-4 text-xl font-semibold">{t(group.titleKey)}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((part) => (
                <Link
                  key={part.id}
                  to={`/parts/${part.category}/${part.id}`}
                  className="rounded-xl bg-[var(--surface)] p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    {part.imageUrl ? (
                      <img
                        src={part.imageUrl}
                        alt=""
                        className={
                          part.category === 'bit'
                            ? 'h-16 w-12 rounded-lg object-contain'
                            : 'h-14 w-14 rounded-lg object-contain'
                        }
                      />
                    ) : (
                      <PartIcon category={part.category} size={56} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-[var(--text)]">{part.name}</h3>
                        <ManufacturerBadge manufacturer={part.manufacturer} />
                      </div>
                      <p className="text-sm text-[var(--muted)]">{part.releaseWave}</p>
                      <div className="mt-2">
                        <RatingBars ratings={part.ratings} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {filteredLaunchers.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold">{t('partsDatabase.launchers')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLaunchers.map((launcher) => (
              <Link
                key={launcher.id}
                to={`/parts/launcher/${launcher.id}`}
                className="rounded-xl bg-[var(--surface)] p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  {launcher.imageUrl ? (
                    <img src={launcher.imageUrl} alt="" className="h-14 w-14 rounded-lg object-contain" />
                  ) : (
                    <PartIcon category="launcher" size={56} />
                  )}
                  <div>
                    <div className="flex items-start gap-2">
                      <h3 className="font-semibold text-[var(--text)]">{launcher.name}</h3>
                      <ManufacturerBadge manufacturer={launcher.manufacturer} />
                    </div>
                    <p className="text-sm text-[var(--muted)]">
                      {launcher.spinCapability} {t('partsDatabase.spin')}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
