import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { useCollectionStore } from '../stores/collection';
import { useAuthStore } from '../stores/auth';
import { useTranslation } from '../i18n';
import { PartIcon } from '../components/PartIcon';
import { inputClass } from '../components/formStyles';
import type { Bey, PartCategory } from '../types';

function formatPrice(owned: { priceEur?: number | null; priceChf?: number | null; priceUsd?: number | null }): string {
  if (owned.priceEur !== undefined && owned.priceEur !== null) {
    return `€${owned.priceEur.toFixed(2)}`;
  }
  if (owned.priceChf !== undefined && owned.priceChf !== null) {
    return `CHF ${owned.priceChf.toFixed(2)}`;
  }
  if (owned.priceUsd !== undefined && owned.priceUsd !== null) {
    return `$${owned.priceUsd.toFixed(2)}`;
  }
  return '';
}

type Currency = 'EUR' | 'CHF' | 'USD';

interface BeyFormProps {
  beys: Bey[];
  initial?: { beyId?: string; purchaseDate?: string | null; shop?: string | null; priceEur?: number | null; priceChf?: number | null; priceUsd?: number | null; setName?: string | null; note?: string | null };
  onSave: (values: { beyId: string; purchaseDate?: string | null; shop?: string | null; priceEur?: number | null; priceChf?: number | null; priceUsd?: number | null; setName?: string | null; note?: string | null }) => void;
  onCancel: () => void;
}

function BeyForm({ beys, initial, onSave, onCancel }: BeyFormProps) {
  const { t } = useTranslation();

  const initialCurrency: Currency =
    initial?.priceChf !== undefined && initial.priceChf !== null
      ? 'CHF'
      : initial?.priceUsd !== undefined && initial.priceUsd !== null
        ? 'USD'
        : 'EUR';
  const initialAmount =
    initial?.priceChf !== undefined && initial.priceChf !== null
      ? initial.priceChf.toString()
      : initial?.priceUsd !== undefined && initial.priceUsd !== null
        ? initial.priceUsd.toString()
        : initial?.priceEur !== undefined && initial.priceEur !== null
          ? initial.priceEur.toString()
          : '';

  const [beyId, setBeyId] = useState(initial?.beyId ?? '');
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchaseDate ?? '');
  const [shop, setShop] = useState(initial?.shop ?? '');
  const [amount, setAmount] = useState(initialAmount);
  const [currency, setCurrency] = useState<Currency>(initialCurrency);
  const [setName, setSetName] = useState(initial?.setName ?? '');
  const [note, setNote] = useState(initial?.note ?? '');

  const sortedBeys = useMemo(() => [...beys].sort((a, b) => a.name.localeCompare(b.name)), [beys]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!beyId) return;
    const value = parseFloat(amount);
    const price = Number.isFinite(value) && value >= 0 ? value : null;
    onSave({
      beyId,
      purchaseDate: purchaseDate || null,
      shop: shop.trim() || null,
      priceEur: currency === 'EUR' ? price : null,
      priceChf: currency === 'CHF' ? price : null,
      priceUsd: currency === 'USD' ? price : null,
      setName: setName.trim() || null,
      note: note.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg bg-[var(--surface)] p-4 shadow-sm">
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">{t('collection.form.bey')}</label>
        <select value={beyId} onChange={(e) => setBeyId(e.target.value)} required className={inputClass}>
          <option value="" disabled>{t('collection.form.selectBey')}</option>
          {sortedBeys.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">{t('collection.purchaseDate')}</label>
          <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">{t('collection.shop')}</label>
          <input type="text" value={shop} onChange={(e) => setShop(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">{t('collection.form.priceAmount')}</label>
          <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">{t('collection.form.priceCurrency')}</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className={inputClass}>
            {(['EUR', 'CHF', 'USD'] as Currency[]).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">{t('collection.set')}</label>
        <input type="text" value={setName} onChange={(e) => setSetName(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">{t('collection.note')}</label>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">{t('collection.save')}</button>
        <button type="button" onClick={onCancel} className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">{t('collection.cancel')}</button>
      </div>
    </form>
  );
}

const PART_CATEGORIES: PartCategory[] = ['blade', 'assistBlade', 'ratchet', 'bit'];

interface PartFormProps {
  parts: { id: string; name: string; category: PartCategory }[];
  initial?: { partId?: string; category?: PartCategory; obtainedFrom?: string | null; purchaseDate?: string | null; note?: string | null };
  onSave: (values: { partId: string; category: PartCategory; obtainedFrom?: string | null; purchaseDate?: string | null; note?: string | null }) => void;
  onCancel: () => void;
}

function PartForm({ parts, initial, onSave, onCancel }: PartFormProps) {
  const { t } = useTranslation();
  const [partId, setPartId] = useState(initial?.partId ?? '');
  const [category, setCategory] = useState<PartCategory>(initial?.category ?? 'blade');
  const [obtainedFrom, setObtainedFrom] = useState(initial?.obtainedFrom ?? '');
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchaseDate ?? '');
  const [note, setNote] = useState(initial?.note ?? '');

  const filteredParts = useMemo(() => parts.filter((p) => p.category === category).sort((a, b) => a.name.localeCompare(b.name)), [parts, category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partId) return;
    onSave({
      partId,
      category,
      obtainedFrom: obtainedFrom.trim() || null,
      purchaseDate: purchaseDate || null,
      note: note.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg bg-[var(--surface)] p-4 shadow-sm">
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">{t('collection.parts.category')}</label>
        <select value={category} onChange={(e) => { setCategory(e.target.value as PartCategory); setPartId(''); }} className={inputClass}>
          {PART_CATEGORIES.map((c) => (
            <option key={c} value={c}>{t(`partDetail.${c}`)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">{t('collection.parts.part')}</label>
        <select value={partId} onChange={(e) => setPartId(e.target.value)} required className={inputClass}>
          <option value="" disabled>{t('collection.form.selectBey')}</option>
          {filteredParts.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">{t('collection.purchaseDate')}</label>
          <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">{t('collection.obtainedFrom')}</label>
          <input type="text" value={obtainedFrom} onChange={(e) => setObtainedFrom(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">{t('collection.note')}</label>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">{t('collection.save')}</button>
        <button type="button" onClick={onCancel} className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">{t('collection.cancel')}</button>
      </div>
    </form>
  );
}

export function Collection() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { database, loading: dbLoading, error: dbError } = useData();
  const { ownedBeys, ownedParts, loading, error, fetch, addBey, updateBey, removeBey, addPart, updatePart, removePart } = useCollectionStore();
  const [tab, setTab] = useState<'beys' | 'parts'>('beys');
  const [adding, setAdding] = useState(false);
  const [editingBeyId, setEditingBeyId] = useState<string | null>(null);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetch();
  }, [user, fetch]);

  if (dbLoading) return <p className="text-[var(--muted)]">{t('errors.loadingDatabase')}</p>;
  if (dbError || !database) return <p className="text-red-600">{t('errors.failedDatabase')}</p>;

  const allParts = useMemo(() => {
    return [
      ...database.blades.map((p) => ({ id: p.id, name: p.name, category: 'blade' as PartCategory })),
      ...database.assistBlades.map((p) => ({ id: p.id, name: p.name, category: 'assistBlade' as PartCategory })),
      ...database.ratchets.map((p) => ({ id: p.id, name: p.name, category: 'ratchet' as PartCategory })),
      ...database.bits.map((p) => ({ id: p.id, name: p.name, category: 'bit' as PartCategory })),
    ];
  }, [database]);

  const beyName = (id: string) => database.beys.find((b) => b.id === id)?.name ?? id;
  const partName = (id: string) => allParts.find((p) => p.id === id)?.name ?? id;

  const handleSaveBey = async (values: Parameters<typeof addBey>[0]) => {
    if (editingBeyId) {
      await updateBey(editingBeyId, values);
      setEditingBeyId(null);
    } else {
      await addBey(values);
    }
    setAdding(false);
  };

  const handleSavePart = async (values: Parameters<typeof addPart>[0]) => {
    if (editingPartId) {
      await updatePart(editingPartId, values);
      setEditingPartId(null);
    } else {
      await addPart(values);
    }
    setAdding(false);
  };

  if (!user) {
    return (
      <div className="rounded-xl bg-[var(--surface)] p-6 text-center shadow-sm">
        <p className="text-[var(--muted)]">{t('collection.loginRequired')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('nav.collection')}</h1>
        <button
          type="button"
          onClick={() => { setAdding(true); setEditingBeyId(null); setEditingPartId(null); }}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t('collection.add')}
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('beys')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === 'beys' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}
        >
          {t('collection.beys')}
        </button>
        <button
          type="button"
          onClick={() => setTab('parts')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === 'parts' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}
        >
          {t('collection.parts.title')}
        </button>
      </div>

      {adding && tab === 'beys' && (
        <BeyForm beys={database.beys} onSave={handleSaveBey} onCancel={() => setAdding(false)} />
      )}
      {adding && tab === 'parts' && (
        <PartForm parts={allParts} onSave={handleSavePart} onCancel={() => setAdding(false)} />
      )}

      {editingBeyId && (
        <BeyForm
          beys={database.beys}
          initial={ownedBeys.find((b) => b.id === editingBeyId)}
          onSave={handleSaveBey}
          onCancel={() => setEditingBeyId(null)}
        />
      )}
      {editingPartId && (
        <PartForm
          parts={allParts}
          initial={ownedParts.find((p) => p.id === editingPartId)}
          onSave={handleSavePart}
          onCancel={() => setEditingPartId(null)}
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-[var(--muted)]">{t('errors.loading')}</p>}

      {tab === 'beys' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ownedBeys.map((b) => {
            const bey = database.beys.find((x) => x.id === b.beyId);
            return (
              <div key={b.id} className="rounded-lg bg-[var(--surface)] p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  {bey?.imageUrl ? (
                    <img src={bey.imageUrl} alt="" className="h-16 w-16 object-contain" />
                  ) : (
                    <PartIcon category="bey" size={64} />
                  )}
                  <div className="flex-1 min-w-0">
                    <Link to={`/beys/${b.beyId}`} className="font-semibold text-blue-600 hover:underline dark:text-blue-400">{beyName(b.beyId)}</Link>
                    <p className="text-xs text-[var(--muted)]">{b.purchaseDate}</p>
                    {b.shop && <p className="text-xs text-[var(--muted)]">{b.shop}</p>}
                    {formatPrice(b) && <p className="text-xs">{formatPrice(b)}</p>}
                    {b.setName && <p className="text-xs text-[var(--muted)]">{t('collection.set')}: {b.setName}</p>}
                    {b.note && <p className="text-xs text-[var(--muted)] truncate">{b.note}</p>}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setEditingBeyId(b.id)} className="text-xs text-blue-600 hover:underline">{t('collection.edit')}</button>
                  <button type="button" onClick={() => removeBey(b.id)} className="text-xs text-red-600 hover:underline">{t('collection.remove')}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'parts' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ownedParts.map((p) => (
            <div key={p.id} className="rounded-lg bg-[var(--surface)] p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <PartIcon category={p.category} size={64} />
                <div className="flex-1 min-w-0">
                  <Link to={`/parts/${p.category}/${p.partId}`} className="font-semibold text-blue-600 hover:underline dark:text-blue-400">{partName(p.partId)}</Link>
                  <p className="text-xs text-[var(--muted)]">{t(`partDetail.${p.category}`)}</p>
                  {p.purchaseDate && <p className="text-xs text-[var(--muted)]">{p.purchaseDate}</p>}
                  {p.obtainedFrom && <p className="text-xs text-[var(--muted)]">{t('collection.obtainedFrom')}: {p.obtainedFrom}</p>}
                  {p.note && <p className="text-xs text-[var(--muted)] truncate">{p.note}</p>}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setEditingPartId(p.id!)} className="text-xs text-blue-600 hover:underline">{t('collection.edit')}</button>
                <button type="button" onClick={() => removePart(p.id!)} className="text-xs text-red-600 hover:underline">{t('collection.remove')}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
