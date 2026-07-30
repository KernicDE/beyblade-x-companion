import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { useProfileStore } from '../stores/profile';
import { UnlockGate } from '../components/UnlockGate';
import { RatingBars } from '../components/RatingBars';
import { PartIcon } from '../components/PartIcon';
import { useTranslation } from '../i18n';
import { recordWithBey } from '../utils/matches';
import type { OwnedBey, OwnedPart } from '../types';

export function formatPurchasePrice(owned: OwnedBey): string {
  if (owned.priceEur === undefined) return '';
  const eur = `€${owned.priceEur.toFixed(2)}`;
  return owned.priceChf !== undefined ? `${eur} (CHF ${owned.priceChf.toFixed(2)})` : eur;
}

function RecordBadge({ wins, losses, winRate }: { wins: number; losses: number; winRate: number }) {
  const { t } = useTranslation();
  if (wins + losses === 0) return null;
  return (
    <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
      {wins}-{losses} · {Math.round(winRate * 100)}% {t('collection.winRate')}
    </span>
  );
}

function CollectionContent() {
  const { t } = useTranslation();
  const { database, loading, error } = useData();
  const { profile } = useProfileStore();
  const [tab, setTab] = useState<'beys' | 'parts'>('beys');

  const beyNameById = useMemo(() => {
    const map = new Map<string, string>();
    database?.beys.forEach((bey) => map.set(bey.id, bey.name));
    return map;
  }, [database]);

  if (loading) return <p className="text-[var(--muted)]">{t('errors.loadingDatabase')}</p>;
  if (error || !database) return <p className="text-red-600">{t('errors.failedDatabase')}</p>;
  if (!profile) return null;

  const ownedBeys = [...profile.ownedBeys].sort((a, b) =>
    (b.purchaseDate ?? '').localeCompare(a.purchaseDate ?? '')
  );
  const ownedParts = [...profile.ownedParts].sort((a, b) =>
    (b.purchaseDate ?? '').localeCompare(a.purchaseDate ?? '')
  );

  const partLookup = (owned: OwnedPart) => {
    const lists = {
      blade: database.blades,
      assistBlade: database.assistBlades,
      ratchet: database.ratchets,
      bit: database.bits,
    } as const;
    return lists[owned.category]?.find((p) => p.id === owned.partId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{t('collection.title')}</h1>
        <div className="flex gap-2">
          {(['beys', 'parts'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                tab === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t(`collection.tab.${key}`)}
              {' '}({key === 'beys' ? ownedBeys.length : ownedParts.length})
            </button>
          ))}
        </div>
      </div>

      {tab === 'beys' && (
        <>
          {ownedBeys.length === 0 && <p className="text-[var(--muted)]">{t('collection.empty')}</p>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ownedBeys.map((owned) => {
              const bey = database.beys.find((b) => b.id === owned.beyId);
              const record = recordWithBey(profile.matches, owned.beyId);
              return (
                <div key={owned.beyId} className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    {bey?.imageUrl ? (
                      <img src={bey.imageUrl} alt="" className="h-16 w-16 rounded-lg object-contain" />
                    ) : (
                      <PartIcon category="bey" size={64} />
                    )}
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/beys/${owned.beyId}`}
                        className="font-semibold hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {bey?.name ?? owned.beyId}
                      </Link>
                      {bey && <p className="text-xs text-[var(--muted)]">{bey.releaseWave}</p>}
                      <div className="mt-1">
                        <RecordBadge wins={record.wins} losses={record.losses} winRate={record.winRate} />
                      </div>
                    </div>
                  </div>
                  <dl className="mt-3 space-y-1 text-sm">
                    {owned.purchaseDate && (
                      <div className="flex justify-between">
                        <dt className="text-[var(--muted)]">{t('collection.purchaseDate')}</dt>
                        <dd>{owned.purchaseDate}</dd>
                      </div>
                    )}
                    {owned.shop && (
                      <div className="flex justify-between">
                        <dt className="text-[var(--muted)]">{t('collection.shop')}</dt>
                        <dd>{owned.shop}</dd>
                      </div>
                    )}
                    {owned.priceEur !== undefined && (
                      <div className="flex justify-between">
                        <dt className="text-[var(--muted)]">{t('collection.price')}</dt>
                        <dd>{formatPurchasePrice(owned)}</dd>
                      </div>
                    )}
                    {owned.setName && (
                      <div className="flex justify-between">
                        <dt className="text-[var(--muted)]">{t('collection.set')}</dt>
                        <dd>{owned.setName}</dd>
                      </div>
                    )}
                  </dl>
                  {owned.personalRatings ? (
                    <div className="mt-3">
                      <p className="mb-1 text-xs font-semibold uppercase text-[var(--muted)]">{t('collection.myRatings')}</p>
                      <RatingBars ratings={owned.personalRatings} size="sm" />
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-[var(--muted)]">{t('collection.notRated')}</p>
                  )}
                  {owned.note && <p className="mt-2 text-xs text-[var(--muted)]">{owned.note}</p>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'parts' && (
        <>
          {ownedParts.length === 0 && <p className="text-[var(--muted)]">{t('collection.empty')}</p>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ownedParts.map((owned) => {
              const part = partLookup(owned);
              return (
                <div key={`${owned.category}-${owned.partId}`} className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    {part?.imageUrl ? (
                      <img src={part.imageUrl} alt="" className="h-12 w-12 rounded-lg object-contain" />
                    ) : (
                      <PartIcon category={owned.category} size={48} />
                    )}
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/parts/${owned.category}/${owned.partId}`}
                        className="font-semibold hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {part?.name ?? owned.partId}
                      </Link>
                      <p className="text-xs text-[var(--muted)]">{t(`partsDatabase.${owned.category}s`)}</p>
                    </div>
                  </div>
                  <dl className="mt-3 space-y-1 text-sm">
                    {owned.obtainedFrom && (
                      <div className="flex justify-between gap-2">
                        <dt className="text-[var(--muted)]">{t('collection.obtainedFrom')}</dt>
                        <dd className="text-right">
                          {beyNameById.get(owned.obtainedFrom) ?? owned.obtainedFrom}
                        </dd>
                      </div>
                    )}
                    {owned.purchaseDate && (
                      <div className="flex justify-between">
                        <dt className="text-[var(--muted)]">{t('collection.purchaseDate')}</dt>
                        <dd>{owned.purchaseDate}</dd>
                      </div>
                    )}
                  </dl>
                  {owned.personalRatings ? (
                    <div className="mt-3">
                      <p className="mb-1 text-xs font-semibold uppercase text-[var(--muted)]">{t('collection.myRatings')}</p>
                      <RatingBars ratings={owned.personalRatings} size="sm" />
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-[var(--muted)]">{t('collection.notRated')}</p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function Collection() {
  return (
    <UnlockGate>
      <CollectionContent />
    </UnlockGate>
  );
}
