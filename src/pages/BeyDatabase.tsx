import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { calculateComboRatings, getBeyParts, calculateTier, buildTypeScores } from '../utils/data';
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

export function BeyDatabase() {
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

  const typeScores = useMemo(() => (database ? buildTypeScores(database).bey : {}), [database]);

  const allTypes = useMemo(() => {
    if (!database) return [];
    const set = new Set<string>();
    database.beys.forEach((b) => {
      const blade = database.blades.find((blade) => blade.id === b.bladeId);
      if (blade?.officialStats.typeTag) set.add(blade.officialStats.typeTag);
    });
    return Array.from(set).sort();
  }, [database]);

  const allBatches = useMemo(() => {
    if (!database) return [];
    const set = new Set<string>();
    database.beys.forEach((b) => {
      const prefix = getBatchPrefix(b.releaseWave);
      if (prefix) set.add(prefix);
    });
    return Array.from(set).sort();
  }, [database]);

  const allTiers = useMemo(() => {
    if (!database) return [];
    const set = new Set<string>();
    const tierOrder = ['S', 'A', 'B', 'C', 'F'];
    database.beys.forEach((b) => {
      const blade = database.blades.find((blade) => blade.id === b.bladeId);
      const ratings = calculateComboRatings(database, getBeyParts(b));
      set.add(calculateTier(ratings, blade?.officialStats.typeTag, typeScores));
    });
    return Array.from(set).sort((a, b) => tierOrder.indexOf(a) - tierOrder.indexOf(b));
  }, [database, typeScores]);

  const allSpins = useMemo(() => {
    if (!database) return [];
    const set = new Set<string>();
    database.beys.forEach((b) => {
      const blade = database.blades.find((blade) => blade.id === b.bladeId);
      if (blade?.officialStats.spinDirection) set.add(blade.officialStats.spinDirection);
    });
    return Array.from(set).sort();
  }, [database]);

  const filteredBeys = useMemo(() => {
    if (!database) return [];
    let items = database.beys.filter((b) => {
      if (!selectedMf.includes(b.manufacturer)) return false;
      const blade = database.blades.find((blade) => blade.id === b.bladeId);
      const ratings = calculateComboRatings(database, getBeyParts(b));
      if (selectedTypes.length > 0 && !selectedTypes.includes(blade?.officialStats.typeTag ?? '')) return false;
      if (selectedBatches.length > 0 && !selectedBatches.includes(getBatchPrefix(b.releaseWave))) return false;
      if (selectedTiers.length > 0 && !selectedTiers.includes(calculateTier(ratings, blade?.officialStats.typeTag, typeScores))) return false;
      if (selectedSpins.length > 0 && !selectedSpins.includes(blade?.officialStats.spinDirection ?? '')) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.releaseWave.toLowerCase().includes(q) ||
        b.manufacturer.toLowerCase().includes(q) ||
        (blade?.officialStats.typeTag?.toLowerCase().includes(q) ?? false)
      );
    });

    items.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'releaseDate':
          return (b.releaseDate || '').localeCompare(a.releaseDate || '');
        case 'type': {
          const ta = database.blades.find((blade) => blade.id === a.bladeId)?.officialStats.typeTag ?? '';
          const tb = database.blades.find((blade) => blade.id === b.bladeId)?.officialStats.typeTag ?? '';
          return ta.localeCompare(tb);
        }
        case 'batch':
          return getBatchPrefix(a.releaseWave).localeCompare(getBatchPrefix(b.releaseWave));
        case 'tier': {
          const tierOrder = ['S','A','B','C','F'];
          const ra = calculateComboRatings(database, getBeyParts(a));
          const rb = calculateComboRatings(database, getBeyParts(b));
          const ta = database.blades.find((blade) => blade.id === a.bladeId)?.officialStats.typeTag;
          const tb = database.blades.find((blade) => blade.id === b.bladeId)?.officialStats.typeTag;
          const tierA = calculateTier(ra, ta, typeScores);
          const tierB = calculateTier(rb, tb, typeScores);
          return tierOrder.indexOf(tierB) - tierOrder.indexOf(tierA);
        }
        case 'attack':
        case 'defense':
        case 'stamina':
        case 'balance': {
          const ra = calculateComboRatings(database, getBeyParts(a));
          const rb = calculateComboRatings(database, getBeyParts(b));
          return rb[sortBy] - ra[sortBy];
        }
        default:
          return 0;
      }
    });

    return items;
  }, [database, selectedMf, selectedTypes, selectedBatches, selectedTiers, selectedSpins, q, sortBy, typeScores]);

  if (loading) return <p className="text-[var(--muted)]">{t('errors.loadingDatabase')}</p>;
  if (error || !database) return <p className="text-red-600">{t('errors.failedDatabase')}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{t('beyDatabase.title')}</h1>
        <ManufacturerFilter selected={selectedMf} onChange={setSelectedMf} />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput value={query} onChange={setQuery} />
          <SortSelect value={sortBy} onChange={setSortBy} />
        </div>
        <div className="flex flex-wrap gap-3">
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

      {filteredBeys.length === 0 && (
        <p className="text-[var(--muted)]">{t('search.noResults')}</p>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredBeys.map((bey) => {
          const ratings = calculateComboRatings(database, getBeyParts(bey));
          const blade = database.blades.find((b) => b.id === bey.bladeId);
          const tier = calculateTier(ratings, blade?.officialStats.typeTag, typeScores);
          return (
            <Link
              key={bey.id}
              to={`/beys/${bey.id}`}
              className="relative rounded-xl bg-[var(--surface)] p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="absolute left-2 bottom-2 flex gap-1">
                <TierBadge tier={tier} />
                <SpinBadge spin={blade?.officialStats.spinDirection} />
              </div>
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
                  <p className="text-sm text-[var(--muted)]">
                    {blade?.officialStats.typeTag ? `${blade.officialStats.typeTag} · ` : ''}
                    {bey.releaseWave}
                  </p>
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
