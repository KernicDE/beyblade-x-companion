import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { scanBarcode, addOwnedBey } from '../api/client';
import { useAuthStore } from '../stores/auth';
import { useTranslation } from '../i18n';
import type { Bey } from '../types';

export function Scan() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [code, setCode] = useState('');
  const [bey, setBey] = useState<Bey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setBey(null);
    setAdded(false);
    try {
      const { barcode } = await scanBarcode(code.trim());
      setBey(barcode.bey || null);
      if (!barcode.bey) {
        setError(t('scan.noBeyLinked'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('scan.notFound'));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleAddToCollection = async () => {
    if (!bey || !user) return;
    setAdding(true);
    setError(null);
    try {
      await addOwnedBey({ beyId: bey.id });
      setAdded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('scan.title')}</h1>
      <p className="text-[var(--muted)]">{t('scan.description')}</p>

      <form onSubmit={handleSubmit} className="flex max-w-md gap-2">
        <input
          ref={inputRef}
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t('scan.placeholder')}
          className="flex-1 rounded border border-gray-300 dark:border-slate-600 bg-[var(--bg)] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '…' : t('scan.lookup')}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {bey && (
        <div className="rounded-lg bg-[var(--surface)] p-4 shadow-sm">
          <div className="flex items-center gap-4">
            {bey.imageUrl && (
              <img
                src={bey.imageUrl}
                alt={bey.name}
                className="h-24 w-24 object-contain"
              />
            )}
            <div className="flex-1">
              <h2 className="text-lg font-semibold">{bey.name}</h2>
              <p className="text-sm text-[var(--muted)]">{bey.releaseWave}</p>
              <div className="mt-2 flex items-center gap-3">
                <Link
                  to={`/beys/${bey.id}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View details →
                </Link>
                {user && !added && (
                  <button
                    type="button"
                    onClick={handleAddToCollection}
                    disabled={adding}
                    className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {adding ? '…' : t('scan.addToCollection')}
                  </button>
                )}
                {added && (
                  <span className="text-xs text-green-600 font-medium">{t('scan.added')} ✓</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
