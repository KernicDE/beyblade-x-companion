import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import type { Part } from '../types';
import { calculateTier } from '../utils/data';
import { RatingBars } from '../components/RatingBars';
import { PartIcon } from '../components/PartIcon';
import { ManufacturerBadge } from '../components/ManufacturerBadge';
import { ManufacturerFilter } from '../components/ManufacturerFilter';
import { SearchInput } from '../components/SearchInput';
import { useTranslation } from '../i18n';
import { SpinBadge } from '../components/SpinBadge';
import { TierBadge } from '../components/TierBadge';
import { SortSelect, type SortKey } from '../components/SortSelect';
import { FilterChips } from '../components/FilterChips';

const MANUFACTURERS = ['Takara Tomy', 'Hasbro'] as const;

function getBatchPrefix(wave: string): string {
  const match = wave.match(/^[A-Za-z]+/);
  return match ? match[0].toUpperCase() : '?';
}

function sortParts(parts: Part[], sortBy: SortKey) {
  const sorted = [...parts];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'releaseDate':
        return (b.releaseDate || '').localeCompare(a.releaseDate || '');
      case 'type':
        return (a.officialStats.typeTag || '').localeCompare(b.officialStats.typeTag || '');
      case 'batch':
        return getBatchPrefix(a.releaseWave).localeCompare(getBatchPrefix(b.releaseWave));
      case 'attack':
      case 'defense':
      case 'stamina':
      case 'balance':
        return b.ratings[sortBy] - a.ratings[sortBy];
      default:
        return 0;
    }
  });
  return sorted;
}

export function PartsDatabase() {
  const { t } = useTranslation();
  const { database, loading, error } = useData();
  const [selectedMf, setSelectedMf] = useState<string[]>([...MANUFACTURERS]);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);

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

  const allTypes = useMemo(() => {
    if (!database) return [];
    const set = new Set<string>();
    [...database.blades, ...database.assistBlades, ...database.ratchets, ...database.bits].forEach((p) => {
      if (p.officialStats.typeTag) set.add(p.officialStats.typeTag);
    });
    return Array.from(set).sort();
  }, [database]);

  const allBatches = useMemo(() => {
    if (!database) return [];
    const set = new Set<string>();
    [...database.blades, ...database.assistBlades, ...database.ratchets, ...database.bits].forEach((p) => {
      const prefix = getBatchPrefix(p.releaseWave);
      if (prefix) set.add(prefix);
    });
    return Array.from(set).sort();
  }, [database]);

  const filterPart = (p: Part) => {
    if (!database) return false;
    if (!selectedMf.includes(p.manufacturer)) return false;
    if (selectedTypes.length > 0 && !selectedTypes.includes(p.officialStats.typeTag ?? '')) return false;
    if (selectedBatches.length > 0 && !selectedBatches.includes(getBatchPrefix(p.releaseWave))) return false;
    return matches(p);
  };

  const filteredLaunchers = database?.launchers.filter((l) => selectedMf.includes(l.manufacturer) && matches(l)) ?? [];

  const groups: { category: Part['category']; titleKey: string; parts: Part[] }[] = useMemo(
    () =>
      database
        ? [
            { category: 'blade', titleKey: 'partsDatabase.blades', parts: database.blades },
            { category: 'assistBlade', titleKey: 'partsDatabase.assistBlades', parts: database.assistBlades },
            { category: 'ratchet', titleKey: 'partsDatabase.ratchets', parts: database.ratchets },
            { category: 'bit', titleKey: 'partsDatabase.bits', parts: database.bits },
          ]
        : [],
    [database]
  );

  if (loading) return <p className="text-[var(--muted)]">{t('errors.loadingDatabase')}</p>;
  if (error || !database) return <p className="text-red-600">{t('errors.failedDatabase')}</p>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{t('partsDatabase.title')}</h1>
        <ManufacturerFilter selected={selectedMf} onChange={setSelectedMf} />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput value={query} onChange={setQuery} />
          <SortSelect value={sortBy} onChange={setSortBy} />
        </div>
        <FilterChips
          options={allTypes}
          selected={selectedTypes}
          onChange={setSelectedTypes}
          label={`${t('sort.type')}:`}
        />
        <FilterChips
          options={allBatches}
          selected={selectedBatches}
          onChange={setSelectedBatches}
          label={`${t('sort.batch')}:`}
        />
      </div>

      {groups.map((group) => {
        const filtered = sortParts(group.parts.filter(filterPart), sortBy);
        if (filtered.length === 0) return null;
        return (
          <section key={group.category}>
            <h2 className="mb-4 text-xl font-semibold">{t(group.titleKey)}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((part) => {
                const tier = calculateTier(part.ratings);
                return (
                  <Link
                    key={part.id}
                    to={`/parts/${part.category}/${part.id}`}
                    className="relative rounded-xl bg-[var(--surface)] p-4 shadow-sm transition hover:shadow-md"
                  >
                    <div className="absolute left-2 top-2 flex gap-1">
                      <SpinBadge spin={part.officialStats.spinDirection} />
                      <TierBadge tier={tier} />
                    </div>
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
                        <p className="text-sm text-[var(--muted)]">
                          {part.officialStats.typeTag ? `${part.officialStats.typeTag} · ` : ''}
                          {part.releaseWave}
                        </p>
                        <div className="mt-2">
                          <RatingBars ratings={part.ratings} />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
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
