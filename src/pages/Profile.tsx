import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { RatingBars } from '../components/RatingBars';
import { useProfileStore } from '../stores/profile';
import { calculateComboRatings } from '../utils/data';
import { compressCreation, compressProfile } from '../utils/links';
import { useTranslation } from '../i18n';

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

export function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { database } = useData();
  const {
    username,
    setUsername,
    currency,
    setCurrency,
    autoOwnParts,
    setAutoOwnParts,
    ownedBeyIds,
    ownedProductIds,
    ownedPartIds,
    creations,
    deleteCreation,
    duplicateCreation,
  } = useProfileStore();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState('');

  const handleShare = async (creationId: string) => {
    const creation = creations.find((c) => c.id === creationId);
    if (!creation) return;
    const compressed = compressCreation(creation);
    const url = `${window.location.origin}${window.location.pathname}#/view/${compressed}`;
    await navigator.clipboard.writeText(url);
    setExportMessage(t('profile.shareCopied'));
    setTimeout(() => setExportMessage(''), 3000);
  };

  const handleExport = async () => {
    const profile = {
      version: 3,
      username,
      ownedBeyIds,
      ownedProductIds,
      ownedPartIds,
      currency,
      autoOwnParts,
      creations,
    };
    const compressed = compressProfile(profile);
    const url = `${window.location.origin}${window.location.pathname}#/import?d=${compressed}`;
    await navigator.clipboard.writeText(url);
    setExportMessage(t('profile.exportCopied'));
    setTimeout(() => setExportMessage(''), 3000);
  };

  const ownedProductsCount = ownedProductIds.length;
  const totalProducts = database?.beys.length ?? 0;
  const uniquePartsCount = ownedPartIds.length;

  const estimatedValue = database
    ? ownedProductIds.reduce((sum, productId) => {
        const bey = database.beys.find((b) => b.id === productId);
        const price = currency === 'JPY' ? bey?.priceJpy : currency === 'USD' ? bey?.priceUsd : bey?.priceEur;
        return price ? sum + price : sum;
      }, 0)
    : 0;

  const seriesCompletion = database
    ? Object.entries(
        database.beys.reduce((acc, bey) => {
          const prefix = getWavePrefix(bey.releaseWave);
          if (!acc[prefix]) acc[prefix] = { owned: 0, total: 0 };
          acc[prefix].total += 1;
          if (ownedProductIds.includes(bey.id)) acc[prefix].owned += 1;
          return acc;
        }, {} as Record<string, { owned: number; total: number }>)
      ).sort(([a], [b]) => a.localeCompare(b))
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{t('profile.title')}</h1>
          {username && <p className="text-sm text-[var(--muted)]">{username}</p>}
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
        >
          {t('profile.exportProfile')}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
          <label htmlFor="profile-username" className="block text-sm font-medium text-[var(--muted)]">
            {t('profile.username')}
          </label>
          <input
            id="profile-username"
            type="text"
            value={username ?? ''}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('profile.usernamePlaceholder')}
            className="mt-1 w-full rounded-md border border-gray-300 dark:border-slate-600 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
          <label htmlFor="profile-currency" className="block text-sm font-medium text-[var(--muted)]">
            {t('profile.currency')}
          </label>
          <select
            id="profile-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as typeof currency)}
            className="mt-1 w-full rounded-md border border-gray-300 dark:border-slate-600 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:border-blue-500 focus:outline-none"
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="JPY">JPY</option>
          </select>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-[var(--surface)] p-4 shadow-sm">
          <input
            type="checkbox"
            checked={autoOwnParts}
            onChange={(e) => setAutoOwnParts(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <p className="text-sm font-medium text-[var(--text)]">{t('profile.autoOwnParts')}</p>
            <p className="text-xs text-[var(--muted)]">{t('profile.autoOwnPartsDesc')}</p>
          </div>
        </label>
      </div>

      {exportMessage && (
        <p className="text-sm text-green-600 dark:text-green-400">{exportMessage}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
          <p className="text-sm text-[var(--muted)]">{t('profile.ownedProducts')}</p>
          <p className="text-2xl font-bold">
            {ownedProductsCount} / {totalProducts}
          </p>
          <p className="text-xs text-[var(--muted)]">
            {totalProducts > 0 ? Math.round((ownedProductsCount / totalProducts) * 100) : 0}%
          </p>
        </div>

        <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
          <p className="text-sm text-[var(--muted)]">{t('profile.uniqueParts')}</p>
          <p className="text-2xl font-bold">{uniquePartsCount}</p>
          <p className="text-xs text-[var(--muted)]">{t('profile.inYourCollection')}</p>
        </div>

        <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm sm:col-span-2">
          <p className="text-sm text-[var(--muted)]">{t('profile.estimatedValue')}</p>
          <p className="text-2xl font-bold">{formatPrice(estimatedValue, currency)}</p>
          <p className="text-xs text-[var(--muted)]">{t('profile.basedOnKnownPrices')}</p>
        </div>
      </div>

      <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          {t('profile.seriesCompletion')}
        </h2>
        <div className="space-y-3">
          {seriesCompletion.map(([prefix, { owned, total }]) => (
            <div key={prefix}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">{WAVE_LABELS[prefix] ?? prefix}</span>
                <span className="text-[var(--muted)]">
                  {owned} / {total} · {total > 0 ? Math.round((owned / total) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-[var(--muted)]/10">
                <div
                  className="h-2 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${total > 0 ? (owned / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {creations.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">{t('profile.noCreations')}</p>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{t('profile.creations')}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {creations.map((creation) => {
              const ratings = database
                ? calculateComboRatings(database, creation)
                : { attack: 0, defense: 0, stamina: 0, balance: 0 };

              return (
                <div key={creation.id} className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-semibold text-gray-900 dark:text-gray-100">{creation.name}</h2>
                      {creation.note && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{creation.note}</p>
                      )}
                    </div>
                    <RatingBars ratings={ratings} size="sm" />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/configurator?edit=${creation.id}`)}
                      className="rounded-md bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                    >
                      {t('profile.edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicateCreation(creation.id)}
                      className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      {t('profile.duplicate')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShare(creation.id)}
                      className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      {t('profile.share')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(creation.id)}
                      className="rounded-md bg-red-100 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                    >
                      {t('profile.delete')}
                    </button>
                  </div>

                  {confirmDelete === creation.id && (
                    <div className="mt-4 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
                      <p className="text-sm text-red-800 dark:text-red-300">
                        {t('profile.deleteConfirm', { name: creation.name })}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            deleteCreation(creation.id);
                            setConfirmDelete(null);
                          }}
                          className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                        >
                          {t('profile.confirm')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          className="rounded-md bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                        >
                          {t('profile.cancel')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
