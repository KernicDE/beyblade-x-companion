import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import type { Part } from '../types';
import { calculateTier, buildTypeScores, getPartTypeScores } from '../utils/data';
import type { TypeScores } from '../utils/data';
import { RatingBars } from '../components/RatingBars';
import { PartIcon } from '../components/PartIcon';
import { ManufacturerBadge } from '../components/ManufacturerBadge';
import { ManufacturerFilter } from '../components/ManufacturerFilter';
import { SearchInput } from '../components/SearchInput';
import { useTranslation } from '../i18n';
import { SpinBadge } from '../components/SpinBadge';
import { TierBadge } from '../components/TierBadge';
import { SortSelect, type SortKey } from '../components/SortSelect';
import { FilterDropdown } from '../components/FilterDropdown';

const MANUFACTURERS = ['Takara Tomy', 'Hasbro'] as const;

function getBatchPrefix(wave: string): string {
  const match = wave.match(/^[A-Za-z]+/);
  return match ? match[0].toUpperCase() : '?';
}

function sortParts(parts: Part[], sortBy: SortKey, typeScores: TypeScores) {
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
      case 'tier': {
        const tierOrder = ['S','A','B','C','F'];
        const scoresA = getPartTypeScores(typeScores, a.category);
        const scoresB = getPartTypeScores(typeScores, b.category);
        const tierA = calculateTier(a.ratings, a.officialStats.typeTag, scoresA);
        const tierB = calculateTier(b.ratings, b.officialStats.typeTag, scoresB);
        return tierOrder.indexOf(tierB) - tierOrder.indexOf(tierA);
      }
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
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [selectedSpins, setSelectedSpins] = useState<string[]>([]);

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

  const typeScores = useMemo(() => (database ? buildTypeScores(database) : { bey: {}, blade: {}, assistBlade: {}, ratchet: {}, bit: {} }), [database]);

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

  const allTiers = useMemo(() => {
    if (!database) return [];
    const set = new Set<string>();
    const tierOrder = ['S', 'A', 'B', 'C', 'F'];
    [...database.blades, ...database.assistBlades, ...database.ratchets, ...database.bits].forEach((p) => {
      const scores = getPartTypeScores(typeScores, p.category);
      set.add(calculateTier(p.ratings, p.officialStats.typeTag, scores));
    });
    return Array.from(set).sort((a, b) => tierOrder.indexOf(a) - tierOrder.indexOf(b));
  }, [database, typeScores]);

  const allSpins = useMemo(() => {
    if (!database) return [];
    const set = new Set<string>();
    [...database.blades, ...database.assistBlades, ...database.ratchets, ...database.bits].forEach((p) => {
      if (p.officialStats.spinDirection) set.add(p.officialStats.spinDirection);
    });
    return Array.from(set).sort();
  }, [database]);

  const filterPart = (p: Part) => {
    if (!database) return false;
    if (!selectedMf.includes(p.manufacturer)) return false;
    if (selectedTypes.length > 0 && !selectedTypes.includes(p.officialStats.typeTag ?? '')) return false;
    if (selectedBatches.length > 0 && !selectedBatches.includes(getBatchPrefix(p.releaseWave))) return false;
    const scores = getPartTypeScores(typeScores, p.category);
    if (selectedTiers.length > 0 && !selectedTiers.includes(calculateTier(p.ratings, p.officialStats.typeTag, scores))) return false;
    if (selectedSpins.length > 0 && !selectedSpins.includes(p.officialStats.spinDirection ?? '')) return false;
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput value={query} onChange={setQuery} />
            <SortSelect value={sortBy} onChange={setSortBy} />
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <FilterDropdown
              label={t('sort.type')}
              options={allTypes}
              selected={selectedTypes}
              onChange={setSelectedTypes}
            />
            <FilterDropdown
              label={t('sort.batch')}
              options={allBatches}
              selected={selectedBatches}
              onChange={setSelectedBatches}
            />
            <FilterDropdown
              label="Tier"
              options={allTiers}
              selected={selectedTiers}
              onChange={setSelectedTiers}
            />
            <FilterDropdown
              label={t('partsDatabase.spin')}
              options={allSpins.map((s) => (s === 'both' ? 'R/L' : s === 'right' ? 'R' : 'L'))}
              selected={selectedSpins.map((s) => (s === 'both' ? 'R/L' : s === 'right' ? 'R' : 'L'))}
              onChange={(selected) =>
                setSelectedSpins(
                  selected.map((s) => (s === 'R/L' ? 'both' : s === 'R' ? 'right' : 'left'))
                )
              }
            />
          </div>
        </div>
      </div>

      {groups.map((group) => {
        const filtered = sortParts(group.parts.filter(filterPart), sortBy, typeScores);
        if (filtered.length === 0) return null;
        return (
          <section key={group.category}>
            <h2 className="mb-4 text-xl font-semibold">{t(group.titleKey)}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((part) => {
                const scores = getPartTypeScores(typeScores, part.category);
                const tier = calculateTier(part.ratings, part.officialStats.typeTag, scores);
                return (
                  <Link
                    key={part.id}
                    to={`/parts/${part.category}/${part.id}`}
                    className="relative rounded-xl bg-[var(--surface)] p-4 shadow-sm transition hover:shadow-md"
                  >
                    <div className="absolute left-2 bottom-2 flex gap-1">
                      <TierBadge tier={tier} />
                      <SpinBadge spin={part.officialStats.spinDirection} />
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
