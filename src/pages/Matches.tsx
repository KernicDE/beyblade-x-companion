import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { useAuthStore } from '../stores/auth';
import { useMatchesStore } from '../stores/matches';
import { useTranslation } from '../i18n';
import { inputClass } from '../components/formStyles';
import type { Match, FinishType } from '../types';

const FINISH_TYPES: FinishType[] = ['xtreme', 'over', 'burst', 'spin'];

interface MatchFormProps {
  beys: { id: string; name: string }[];
  initial?: Partial<Match>;
  onSave: (values: Omit<Match, 'id' | 'countsInStats'>) => void;
  onCancel: () => void;
}

function MatchForm({ beys, initial, onSave, onCancel }: MatchFormProps) {
  const { t } = useTranslation();
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [myBeyId, setMyBeyId] = useState(initial?.myBey?.source === 'bey' ? initial.myBey.beyId : '');
  const [opponentName, setOpponentName] = useState(initial?.opponent?.name ?? '');
  const [opponentBeyId, setOpponentBeyId] = useState(initial?.opponent?.beyId ?? '');
  const [result, setResult] = useState<'win' | 'loss'>(initial?.result ?? 'win');
  const [finishType, setFinishType] = useState<FinishType | ''>(initial?.finishType ?? '');
  const [note, setNote] = useState(initial?.note ?? '');

  const sortedBeys = useMemo(() => [...beys].sort((a, b) => a.name.localeCompare(b.name)), [beys]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myBeyId || !opponentName.trim()) return;
    onSave({
      date,
      myBey: { source: 'bey', beyId: myBeyId },
      opponent: {
        name: opponentName.trim(),
        ...(opponentBeyId ? { beyId: opponentBeyId } : {}),
      },
      result,
      finishType: finishType || undefined,
      note: note.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg bg-[var(--surface)] p-4 shadow-sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">{t('matches.date')}</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">{t('matches.result')}</label>
          <select value={result} onChange={(e) => setResult(e.target.value as 'win' | 'loss')} className={inputClass}>
            <option value="win">{t('matches.win')}</option>
            <option value="loss">{t('matches.loss')}</option>
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">{t('matches.myBey')}</label>
        <select value={myBeyId} onChange={(e) => setMyBeyId(e.target.value)} required className={inputClass}>
          <option value="" disabled>{t('collection.form.selectBey')}</option>
          {sortedBeys.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">{t('matches.opponent')}</label>
          <input type="text" value={opponentName} onChange={(e) => setOpponentName(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--muted)]">{t('matches.opponentBey')}</label>
          <select value={opponentBeyId} onChange={(e) => setOpponentBeyId(e.target.value)} className={inputClass}>
            <option value="">{t('matches.opponentBeyUnknown')}</option>
            {sortedBeys.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--muted)]">{t('matches.finishTypeLabel')}</label>
        <select value={finishType} onChange={(e) => setFinishType(e.target.value as FinishType | '')} className={inputClass}>
          <option value="">{t('matches.noFinish')}</option>
          {FINISH_TYPES.map((f) => (
            <option key={f} value={f}>{t(`matches.finishNames.${f}`)}</option>
          ))}
        </select>
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

export function Matches() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { database, loading: dbLoading, error: dbError } = useData();
  const { matches, loading, error, fetch, add, update, remove } = useMatchesStore();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetch();
  }, [user, fetch]);

  if (dbLoading) return <p className="text-[var(--muted)]">{t('errors.loadingDatabase')}</p>;
  if (dbError || !database) return <p className="text-red-600">{t('errors.failedDatabase')}</p>;

  const handleSave = async (values: Omit<Match, 'id' | 'countsInStats'>) => {
    if (editingId) {
      await update(editingId, values);
      setEditingId(null);
    } else {
      await add(values);
    }
    setAdding(false);
  };

  const stats = useMemo(() => {
    const total = matches.length;
    const wins = matches.filter((m) => m.result === 'win').length;
    const losses = total - wins;
    const finishCounts = FINISH_TYPES.reduce((acc, f) => {
      acc[f] = matches.filter((m) => m.finishType === f).length;
      return acc;
    }, {} as Record<FinishType, number>);
    return { total, wins, losses, winRate: total > 0 ? Math.round((wins / total) * 100) : 0, finishCounts };
  }, [matches]);

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
        <h1 className="text-2xl font-bold">{t('nav.matches')}</h1>
        <button
          type="button"
          onClick={() => { setAdding(true); setEditingId(null); }}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t('matches.add')}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg bg-[var(--surface)] p-4 text-center shadow-sm">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-[var(--muted)]">{t('matches.total')}</p>
        </div>
        <div className="rounded-lg bg-[var(--surface)] p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-green-600">{stats.wins}</p>
          <p className="text-xs text-[var(--muted)]">{t('matches.wins')}</p>
        </div>
        <div className="rounded-lg bg-[var(--surface)] p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-red-600">{stats.losses}</p>
          <p className="text-xs text-[var(--muted)]">{t('matches.losses')}</p>
        </div>
        <div className="rounded-lg bg-[var(--surface)] p-4 text-center shadow-sm">
          <p className="text-2xl font-bold">{stats.winRate}%</p>
          <p className="text-xs text-[var(--muted)]">{t('matches.winRate')}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FINISH_TYPES.map((f) => (
          <span key={f} className="rounded-full bg-[var(--muted)]/10 px-3 py-1 text-xs">
            {t(`matches.finishNames.${f}`)}: {stats.finishCounts[f]}
          </span>
        ))}
      </div>

      {adding && <MatchForm beys={database.beys} onSave={handleSave} onCancel={() => setAdding(false)} />}
      {editingId && (
        <MatchForm
          beys={database.beys}
          initial={matches.find((m) => m.id === editingId)}
          onSave={handleSave}
          onCancel={() => setEditingId(null)}
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-[var(--muted)]">{t('errors.loading')}</p>}

      <div className="space-y-3">
        {matches.map((m) => {
          const myBey = database.beys.find((b) => b.id === (m.myBey.source === 'bey' ? m.myBey.beyId : undefined));
          const opponentBey = m.opponent.beyId ? database.beys.find((b) => b.id === m.opponent.beyId) : null;
          return (
            <div key={m.id} className="flex items-center justify-between rounded-lg bg-[var(--surface)] p-4 shadow-sm">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[var(--muted)]">{m.date}</span>
                  <span className={`font-semibold ${m.result === 'win' ? 'text-green-600' : 'text-red-600'}`}>
                    {m.result === 'win' ? t('matches.win') : t('matches.loss')}
                  </span>
                  {m.finishType && <span className="text-xs text-[var(--muted)]">({t(`matches.finishNames.${m.finishType}`)})</span>}
                </div>
                <p className="font-medium">
                  {myBey ? (
                    <Link to={`/beys/${myBey.id}`} className="text-blue-600 hover:underline dark:text-blue-400">{myBey.name}</Link>
                  ) : (
                    '?'
                  )}
                  {' vs '}
                  {opponentBey ? (
                    <Link to={`/beys/${opponentBey.id}`} className="text-blue-600 hover:underline dark:text-blue-400">{opponentBey.name}</Link>
                  ) : (
                    m.opponent.name
                  )}
                </p>
                {m.note && <p className="text-xs text-[var(--muted)]">{m.note}</p>}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditingId(m.id)} className="text-xs text-blue-600 hover:underline">{t('collection.edit')}</button>
                <button type="button" onClick={() => remove(m.id)} className="text-xs text-red-600 hover:underline">{t('collection.remove')}</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
