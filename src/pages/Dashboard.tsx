import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { useProfileStore } from '../stores/profile';
import { useTranslation } from '../i18n';
import {
  calculateComboRatings,
  calculateTier,
  buildTypeScores,
  getBeyParts,
  getPartById,
} from '../utils/data';
import { PartIcon } from '../components/PartIcon';
import { TierBadge } from '../components/TierBadge';
import type { PartCategory } from '../types';
import type { Database } from '../utils/data';

const WAVE_LABELS: Record<string, string> = {
  BX: 'BX',
  UX: 'UX',
  CX: 'CX',
  Limited: 'Limited',
  Hasbro: 'Hasbro',
};

function getWavePrefix(wave: string): string {
  if (wave.startsWith('BX')) return 'BX';
  if (wave.startsWith('UX')) return 'UX';
  if (wave.startsWith('CX')) return 'CX';
  if (wave.startsWith('F') || wave.startsWith('G')) return 'Hasbro';
  return 'Limited';
}

function formatPrice(amount: number, currency: string): string {
  if (currency === 'JPY') return `¥${Math.round(amount)}`;
  if (currency === 'USD') return `$${amount.toFixed(2)}`;
  return `€${amount.toFixed(2)}`;
}

function getPartName(database: Database, category: PartCategory, id: string): string {
  const part = getPartById(database, id, category);
  return part?.name ?? id;
}

function getPartImage(database: Database, category: PartCategory, id: string): string | undefined {
  const part = getPartById(database, id, category);
  return part?.imageUrl;
}

export function Dashboard() {
  const { t } = useTranslation();
  const { database, loading, error } = useData();
  const {
    username,
    currency,
    ownedProductIds,
    ownedPartIds,
  } = useProfileStore();

  const typeScores = useMemo(() => (database ? buildTypeScores(database) : null), [database]);

  const ownedBladesByType = useMemo(() => {
    if (!database) return [];
    const map: Record<string, number> = {};
    database.blades
      .filter((b) => ownedPartIds.includes(b.id))
      .forEach((b) => {
        const tag = b.officialStats.typeTag ?? 'Type';
        map[tag] = (map[tag] ?? 0) + 1;
      });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [database, ownedPartIds]);

  const strongestParts = useMemo(() => {
    if (!database || !typeScores) {
      return { attack: [], defense: [], stamina: [] } as Record<string, { partId: string; category: PartCategory; name: string; imageUrl?: string; score: number }[]>;
    }
    const result: Record<string, { partId: string; category: PartCategory; name: string; imageUrl?: string; score: number }[]> = { attack: [], defense: [], stamina: [] };
    const categories: PartCategory[] = ['blade', 'ratchet', 'bit', 'assistBlade'];
    (['Attack', 'Defense', 'Stamina'] as const).forEach((typeTag) => {
      const list: { partId: string; category: PartCategory; name: string; imageUrl?: string; score: number }[] = [];
      categories.forEach((category) => {
        const parts = category === 'blade' ? database.blades : category === 'ratchet' ? database.ratchets : category === 'bit' ? database.bits : database.assistBlades;
        parts
          .filter((p) => p.officialStats.typeTag === typeTag && ownedPartIds.includes(p.id))
          .forEach((p) => {
            const score = typeTag === 'Attack'
              ? p.ratings.attack * 2 + p.ratings.defense + p.ratings.stamina + p.ratings.balance
              : typeTag === 'Defense'
                ? p.ratings.defense * 2 + p.ratings.attack + p.ratings.stamina + p.ratings.balance
                : p.ratings.stamina * 2 + p.ratings.attack + p.ratings.defense + p.ratings.balance;
            list.push({ partId: p.id, category, name: p.name, imageUrl: p.imageUrl, score });
          });
      });
      result[typeTag.toLowerCase()] = list.sort((a, b) => b.score - a.score).slice(0, 3);
    });
    return result;
  }, [database, ownedPartIds, typeScores]);

  if (loading) return <p className="text-[var(--muted)]">{t('errors.loadingDatabase')}</p>;
  if (error || !database) return <p className="text-red-600">{t('errors.failedDatabase')}</p>;

  const totalProducts = database.beys.length;
  const ownedProductsCount = ownedProductIds.length;
  const uniquePartsCount = ownedPartIds.length;

  const estimatedValue = ownedProductIds.reduce((sum, productId) => {
    const bey = database.beys.find((b) => b.id === productId);
    const price = currency === 'JPY' ? bey?.priceJpy : currency === 'USD' ? bey?.priceUsd : bey?.priceEur;
    return price ? sum + price : sum;
  }, 0);

  const seriesCompletion = Object.entries(
    database.beys.reduce((acc, bey) => {
      const prefix = getWavePrefix(bey.releaseWave);
      if (!acc[prefix]) acc[prefix] = { owned: 0, total: 0 };
      acc[prefix].total += 1;
      if (ownedProductIds.includes(bey.id)) acc[prefix].owned += 1;
      return acc;
    }, {} as Record<string, { owned: number; total: number }>)
  ).sort(([a], [b]) => a.localeCompare(b));

  const metaParts = database.meta?.metaParts ?? [];
  const ownedMetaParts = metaParts.filter((mp) => ownedPartIds.includes(mp.partId));
  const missingMetaParts = metaParts
    .filter((mp) => !ownedPartIds.includes(mp.partId))
    .sort((a, b) => b.appearances - a.appearances);

  const metaCoveragePercent = metaParts.length > 0
    ? Math.round((ownedMetaParts.length / metaParts.length) * 100)
    : 0;

  const priorityOne = missingMetaParts[0];

  const recommendations = (database.meta?.recommendedPurchases ?? [])
    .map((rec) => {
      const beysInWave = database.beys.filter((b) => b.releaseWave === rec.releaseWave);
      const metaPartIdsInWave = new Set<string>();
      beysInWave.forEach((bey) => {
        const parts = getBeyParts(bey);
        [parts.bladeId, parts.assistBladeId, parts.ratchetId, parts.bitId].forEach((id) => {
          if (id) metaPartIdsInWave.add(id);
        });
      });
      const missingInWave = metaParts.filter(
        (mp) => metaPartIdsInWave.has(mp.partId) && !ownedPartIds.includes(mp.partId)
      );
      const price = currency === 'JPY'
        ? beysInWave[0]?.priceJpy
        : currency === 'USD'
          ? beysInWave[0]?.priceUsd
          : beysInWave[0]?.priceEur;
      return {
        ...rec,
        beysInWave,
        missingInWave,
        price,
      };
    })
    .filter((rec) => rec.missingInWave.length > 0)
    .sort((a, b) => a.priority - b.priority);

  const mostUsefulPurchase = recommendations[0];

  const topCombos = (database.meta?.topCombos ?? [])
    .map((combo) => {
      const bey = database.beys.find((b) => b.id === combo.beyId);
      return { ...combo, bey };
    })
    .filter((combo) => combo.bey)
    .slice(0, 6);

  const partsByType = [
    { key: 'blade', label: t('partsDatabase.blades'), count: ownedPartIds.filter((id) => database.blades.some((p) => p.id === id)).length, total: database.blades.length, color: 'bg-blue-500' },
    { key: 'ratchet', label: t('partsDatabase.ratchets'), count: ownedPartIds.filter((id) => database.ratchets.some((p) => p.id === id)).length, total: database.ratchets.length, color: 'bg-amber-500' },
    { key: 'bit', label: t('partsDatabase.bits'), count: ownedPartIds.filter((id) => database.bits.some((p) => p.id === id)).length, total: database.bits.length, color: 'bg-emerald-500' },
    { key: 'assistBlade', label: t('partsDatabase.assistBlades'), count: ownedPartIds.filter((id) => database.assistBlades.some((p) => p.id === id)).length, total: database.assistBlades.length, color: 'bg-purple-500' },
  ];

  const typeColors: Record<string, string> = {
    Attack: 'text-red-600 dark:text-red-400',
    Defense: 'text-blue-600 dark:text-blue-400',
    Stamina: 'text-green-600 dark:text-green-400',
    Balance: 'text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
        {username && <p className="text-sm text-[var(--muted)]">{username}</p>}
      </div>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <span>⚡</span>
          {t('dashboard.quickInsights')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
            <p className="text-sm text-[var(--muted)]">{t('dashboard.metaCoverage')}</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{metaCoveragePercent}%</p>
            <p className="text-xs text-[var(--muted)]">{ownedMetaParts.length}/{metaParts.length} {t('dashboard.uniqueParts').toLowerCase()}</p>
          </div>
          <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
            <p className="text-sm text-[var(--muted)]">{t('dashboard.remainingMetaGap')}</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{missingMetaParts.length}</p>
            <p className="text-xs text-[var(--muted)]">{t('dashboard.metaPartsNotOwned').toLowerCase()}</p>
          </div>
          <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
            <p className="text-sm text-[var(--muted)]">{t('dashboard.priority')}</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {priorityOne ? getPartName(database, priorityOne.category, priorityOne.partId) : '-'}
            </p>
            <p className="text-xs text-[var(--muted)]">
              {priorityOne ? `${priorityOne.appearances} ${t('dashboard.appearances')}` : ''}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
            <p className="text-sm text-[var(--muted)]">{t('dashboard.mostUsefulPurchase')}</p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {mostUsefulPurchase ? mostUsefulPurchase.releaseWave : '-'}
            </p>
            <p className="text-xs text-[var(--muted)]">
              {mostUsefulPurchase && mostUsefulPurchase.price !== undefined
                ? `${mostUsefulPurchase.missingInWave.length} meta parts · ${formatPrice(mostUsefulPurchase.price, currency)}`
                : ''}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <span>🎯</span>
          {t('profile.title')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
            <p className="text-sm text-[var(--muted)]">{t('dashboard.ownedProducts')}</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{ownedProductsCount}</p>
            <p className="text-xs text-[var(--muted)]">{t('profile.inYourCollection')} · {totalProducts} total</p>
          </div>
          <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
            <p className="text-sm text-[var(--muted)]">{t('dashboard.uniqueParts')}</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{uniquePartsCount}</p>
            <p className="text-xs text-[var(--muted)]">{t('profile.inYourCollection')}</p>
          </div>
          <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
            <p className="text-sm text-[var(--muted)]">{t('dashboard.estimatedValue')}</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatPrice(estimatedValue, currency)}</p>
            <p className="text-xs text-[var(--muted)]">{t('profile.basedOnKnownPrices')}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          {t('dashboard.seriesCompletion')}
        </h2>
        <div className="space-y-3">
          {seriesCompletion.map(([prefix, { owned, total }]) => (
            <div key={prefix}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">{WAVE_LABELS[prefix] ?? prefix}</span>
                <span className="text-[var(--muted)]">{owned} / {total} · {total > 0 ? Math.round((owned / total) * 100) : 0}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[var(--muted)]/10">
                <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${total > 0 ? (owned / total) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <span>🏆</span>
          {t('dashboard.topMetaCombos')}
        </h2>
        {topCombos.length === 0 ? (
          <p className="text-[var(--muted)]">{t('search.noResults')}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topCombos.map((combo, index) => {
              const bey = combo.bey!;
              const parts = getBeyParts(bey);
              const blade = getPartById(database, parts.bladeId, 'blade');
              const ratings = calculateComboRatings(database, parts);
              const tier = calculateTier(ratings, blade?.officialStats.typeTag, typeScores?.bey);
              return (
                <Link
                  key={combo.beyId}
                  to={`/beys/${combo.beyId}`}
                  className="rounded-xl bg-[var(--surface)] p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      {index + 1}
                    </div>
                    {combo.bey?.imageUrl ? (
                      <img src={combo.bey.imageUrl} alt="" className="h-16 w-16 rounded-lg object-contain" />
                    ) : (
                      <PartIcon category="bey" size={64} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold">{bey.name}</h3>
                        <TierBadge tier={tier} size="sm" />
                      </div>
                      <p className="text-xs text-[var(--muted)]">{combo.appearances} {t('dashboard.appearances')}</p>
                      <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        {t('dashboard.metaScore')} {combo.metaScore}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <span>🛒</span>
          {t('dashboard.recommendedPurchases')}
        </h2>
        {recommendations.length === 0 ? (
          <p className="text-[var(--muted)]">{t('dashboard.noRecommendations')}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.slice(0, 6).map((rec) => (
              <div key={rec.releaseWave} className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                    {getWavePrefix(rec.releaseWave)}
                  </span>
                  <span className="text-sm text-[var(--muted)]">{rec.releaseWave}</span>
                </div>
                <h3 className="font-semibold">Random Booster {rec.releaseWave}</h3>
                {rec.price !== undefined && <p className="text-sm text-[var(--muted)]">{formatPrice(rec.price, currency)}</p>}
                <p className="mt-3 text-xs font-semibold uppercase text-[var(--muted)]">{t('dashboard.metaPartsNotOwned')}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {rec.missingInWave.slice(0, 12).map((mp) => (
                    <Link
                      key={mp.partId}
                      to={`/parts/${mp.category}/${mp.partId}`}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      {getPartName(database, mp.category, mp.partId)}
                    </Link>
                  ))}
                </div>
                <p className="mt-3 text-xs text-[var(--muted)]">{rec.missingInWave.length} meta parts</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <span>🧩</span>
          {t('dashboard.mainGaps')}
        </h2>
        <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
          {missingMetaParts.length === 0 ? (
            <p className="text-[var(--muted)]">{t('dashboard.noMissingMetaParts')}</p>
          ) : (
            <div className="space-y-3">
              {missingMetaParts.slice(0, 5).map((mp, index) => {
                const imageUrl = getPartImage(database, mp.category, mp.partId);
                return (
                  <div key={mp.partId} className="flex items-center gap-3">
                    <span className="w-4 text-sm font-medium text-[var(--muted)]">{index + 1}</span>
                    {imageUrl ? (
                      <img src={imageUrl} alt="" className="h-10 w-10 rounded-lg object-contain" />
                    ) : (
                      <PartIcon category={mp.category} size={40} />
                    )}
                    <div className="min-w-0 flex-1">
                      <Link to={`/parts/${mp.category}/${mp.partId}`} className="font-medium hover:text-blue-600 dark:hover:text-blue-400">
                        {getPartName(database, mp.category, mp.partId)}
                      </Link>
                    </div>
                    <span className="text-sm text-[var(--muted)]">{mp.appearances}x</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <span>📊</span>
          {t('dashboard.collectionDistribution')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">{t('dashboard.partsByType')}</h3>
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  {partsByType.reduce(
                    (acc, type) => {
                      const total = partsByType.reduce((s, p) => s + p.count, 0);
                      if (total === 0) return acc;
                      const dash = (type.count / total) * 100;
                      const stroke = (
                        <circle
                          key={type.key}
                          cx="18"
                          cy="18"
                          r="15.9"
                          fill="none"
                          strokeWidth="4"
                          strokeDasharray={`${dash} ${100 - dash}`}
                          strokeDashoffset={-acc.offset}
                          className={type.color}
                        />
                      );
                      return { elements: [...acc.elements, stroke], offset: acc.offset + dash };
                    },
                    { elements: [] as React.ReactNode[], offset: 0 }
                  ).elements}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold">{uniquePartsCount}</span>
                  <span className="text-[10px] uppercase text-[var(--muted)]">{t('dashboard.uniqueParts')}</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {partsByType.map((type) => (
                  <div key={type.key} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${type.color}`} />
                      <span>{type.label}</span>
                    </div>
                    <span className="text-[var(--muted)]">{type.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">{t('dashboard.ownedBladeTypes')}</h3>
            {ownedBladesByType.length === 0 ? (
              <p className="text-[var(--muted)]">{t('search.noResults')}</p>
            ) : (
              <div className="space-y-3">
                {ownedBladesByType.map(([typeTag, count]) => {
                  const total = ownedBladesByType.reduce((s, [, c]) => s + c, 0);
                  return (
                    <div key={typeTag}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className={typeColors[typeTag] ?? 'text-[var(--text)]'}>{typeTag}</span>
                        <span className="text-[var(--muted)]">{count} ({total > 0 ? Math.round((count / total) * 100) : 0}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[var(--muted)]/10">
                        <div className="h-2 rounded-full bg-red-500 transition-all" style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <span>💪</span>
          {t('dashboard.strongestParts')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(['attack', 'defense', 'stamina'] as const).map((typeKey) => {
            const typeTag = typeKey === 'attack' ? 'Attack' : typeKey === 'defense' ? 'Defense' : 'Stamina';
            const list = strongestParts[typeKey];
            return (
              <div key={typeKey} className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
                <h3 className={`mb-3 flex items-center gap-2 text-sm font-semibold uppercase ${typeColors[typeTag]}`}>
                  <span>{typeKey === 'attack' ? '⚔️' : typeKey === 'defense' ? '🛡️' : '🌀'}</span>
                  {t(`dashboard.${typeKey}`)}
                </h3>
                {list.length === 0 ? (
                  <p className="text-[var(--muted)]">{t('search.noResults')}</p>
                ) : (
                  <div className="space-y-3">
                    {list.map((item, index) => (
                      <div key={item.partId} className="flex items-center gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                          {index + 1}
                        </span>
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="h-8 w-8 rounded-lg object-contain" />
                        ) : (
                          <PartIcon category={item.category} size={32} />
                        )}
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
                        <span className="text-sm text-[var(--muted)]">{item.score}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
