import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { useProfileStore } from '../stores/profile';
import { UnlockGate } from '../components/UnlockGate';
import { PartIcon } from '../components/PartIcon';
import { useTranslation } from '../i18n';
import { inputClass } from '../components/formStyles';
import { recordWithBey } from '../utils/matches';
import { getPartById } from '../utils/data';
import type { Bey, OwnedBey, OwnedPart, PartCategory } from '../types';

export function formatPurchasePrice(owned: OwnedBey): string {
  if (owned.priceEur === undefined) return '';
  const eur = `€${owned.priceEur.toFixed(2)}`;
  return owned.priceChf !== undefined ? `${eur} (CHF ${owned.priceChf.toFixed(2)})` : eur;
}

interface OwnedBeyFormProps {
  beys: Bey[];
  initial?: OwnedBey;
  onSave: (values: Omit<OwnedBey, 'id'>) => void;
  onCancel: () => void;
}

function OwnedBeyForm({ beys, initial, onSave, onCancel }: OwnedBeyFormProps) {
  const { t } = useTranslation();
  const [beyId, setBeyId] = useState(initial?.beyId ?? '');
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchaseDate ?? '');
  const [shop, setShop] = useState(initial?.shop ?? '');
  const [priceEur, setPriceEur] = useState(initial?.priceEur?.toString() ?? '');
  const [priceChf, setPriceChf] = useState(initial?.priceChf?.toString() ?? '');
  const [setName, setSetName] = useState(initial?.setName ?? '');
  const [note, setNote] = useState(initial?.note ?? '');

  const sortedBeys = useMemo(
    () => [...beys].sort((a, b) => a.name.localeCompare(b.name)),
    [beys]
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!beyId) return;
    const eur = parseFloat(priceEur);
    const chf = parseFloat(priceChf);
    onSave({
      beyId,
      purchaseDate: purchaseDate || undefined,
      shop: shop.trim() || undefined,
      priceEur: Number.isFinite(eur) ? eur : undefined,
      priceChf: Number.isFinite(chf) ? chf : undefined,
      setName: setName.trim() || undefined,
      note: note.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
          {t('collection.form.bey')}
        </label>
        <select
          value={beyId}
          onChange={(e) => setBeyId(e.target.value)}
          required
          className={inputClass}
        >
          <option value="" disabled>
            {t('collection.form.selectBey')}
          </option>
          {sortedBeys.map((bey) => (
            <option key={bey.id} value={bey.id}>
              {bey.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
            {t('collection.purchaseDate')}
          </label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
            {t('collection.shop')}
          </label>
          <input
            type="text"
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
            {t('collection.form.priceEur')}
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={priceEur}
            onChange={(e) => setPriceEur(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
            {t('collection.form.priceChf')}
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={priceChf}
            onChange={(e) => setPriceChf(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
          {t('collection.set')}
        </label>
        <input
          type="text"
          value={setName}
          onChange={(e) => setSetName(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
          {t('collection.note')}
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t('collection.save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          {t('collection.cancel')}
        </button>
      </div>
    </form>
  );
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
  const { profile, addOwnedBey, updateOwnedBey, removeOwnedBey } = useProfileStore();
  const [tab, setTab] = useState<'beys' | 'parts' | 'launchers'>('beys');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

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
  const ownedLaunchers = profile.ownedLaunchers ?? [];

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
          {(['beys', 'parts', 'launchers'] as const).map((key) => (
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
              {' '}({key === 'beys' ? ownedBeys.length : key === 'parts' ? ownedParts.length : ownedLaunchers.length})
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-[var(--muted)]">{t('collection.localEditsHint')}</p>

      {tab === 'beys' && (
        <>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setAdding(true);
                setEditingId(null);
              }}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              {t('collection.addBey')}
            </button>
          </div>
          {adding && (
            <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
              <h2 className="mb-3 font-semibold">{t('collection.addBey')}</h2>
              <OwnedBeyForm
                beys={database.beys}
                onSave={(values) => {
                  addOwnedBey(values);
                  setAdding(false);
                }}
                onCancel={() => setAdding(false)}
              />
            </div>
          )}
          {ownedBeys.length === 0 && <p className="text-[var(--muted)]">{t('collection.empty')}</p>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ownedBeys.map((owned) => {
              const bey = database.beys.find((b) => b.id === owned.beyId);
              const record = recordWithBey(profile.matches, owned.beyId, profile.ownedBeys);
              if (editingId === owned.id) {
                return (
                  <div key={owned.id} className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
                    <h2 className="mb-3 font-semibold">{bey?.name ?? owned.beyId}</h2>
                    <OwnedBeyForm
                      beys={database.beys}
                      initial={owned}
                      onSave={(values) => {
                        updateOwnedBey(owned.id, values);
                        setEditingId(null);
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                );
              }
              return (
                <div key={owned.id} className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
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
                  {bey && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        { cat: 'blade', id: bey.bladeId, label: t('beyDetail.blade') },
                        { cat: 'assistBlade', id: bey.assistBladeId, label: t('beyDetail.assistBlade') },
                        { cat: 'ratchet', id: bey.ratchetId, label: t('beyDetail.ratchet') },
                        { cat: 'bit', id: bey.bitId, label: t('beyDetail.bit') },
                      ].map(({ cat, id, label }) => {
                        if (!id) return null;
                        const part = getPartById(database, id, cat as PartCategory);
                        return (
                          <Link
                            key={`${cat}-${id}`}
                            to={`/parts/${cat}/${id}`}
                            className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                          >
                            {label}:
                            <span className="text-blue-700 dark:text-blue-300">{part?.name ?? id}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
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
                  {owned.note && <p className="mt-2 text-xs text-[var(--muted)]">{owned.note}</p>}
                  <div className="mt-3 flex gap-2">
                    {confirmRemoveId === owned.id ? (
                      <>
                        <span className="flex-1 self-center text-xs text-[var(--muted)]">
                          {t('collection.removeConfirm')}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            removeOwnedBey(owned.id);
                            setConfirmRemoveId(null);
                          }}
                          className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                        >
                          {t('collection.confirm')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveId(null)}
                          className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                        >
                          {t('collection.cancel')}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(owned.id);
                            setAdding(false);
                          }}
                          className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                        >
                          {t('collection.edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveId(owned.id)}
                          className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-red-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-red-400 dark:hover:bg-gray-600"
                        >
                          {t('collection.remove')}
                        </button>
                      </>
                    )}
                  </div>
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
                        <dt className="text-[var(--muted)]">{t('collection.set')}</dt>
                        <dd className="text-right">
                          {beyNameById.get(owned.obtainedFrom) ? (
                            <Link
                              to={`/beys/${owned.obtainedFrom}`}
                              className="text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {beyNameById.get(owned.obtainedFrom)}
                            </Link>
                          ) : (
                            owned.obtainedFrom
                          )}
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
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'launchers' && (
        <>
          {ownedLaunchers.length === 0 && <p className="text-[var(--muted)]">{t('collection.empty')}</p>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ownedLaunchers.map((owned) => {
              const launcher = database.launchers.find((l) => l.id === owned.launcherId);
              return (
                <div key={owned.launcherId} className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    {launcher?.imageUrl ? (
                      <img src={launcher.imageUrl} alt="" className="h-12 w-12 rounded-lg object-contain" />
                    ) : (
                      <PartIcon category="launcher" size={48} />
                    )}
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/parts/launcher/${owned.launcherId}`}
                        className="font-semibold hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {launcher?.name ?? owned.launcherId}
                      </Link>
                      <p className="text-xs text-[var(--muted)]">
                        {launcher?.spinCapability === 'left'
                          ? t('partDetail.left')
                          : launcher?.spinCapability === 'both'
                            ? t('partDetail.both')
                            : t('partDetail.right')}
                      </p>
                    </div>
                    {owned.quantity !== undefined && owned.quantity > 1 && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        ×{owned.quantity}
                      </span>
                    )}
                  </div>
                  {owned.note && <p className="mt-2 text-xs text-[var(--muted)]">{owned.note}</p>}
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
