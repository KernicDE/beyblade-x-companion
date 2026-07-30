import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { useProfileStore } from '../stores/profile';
import { useCreationsStore } from '../stores/creations';
import { UnlockGate } from '../components/UnlockGate';
import { useTranslation } from '../i18n';
import {
  allCreations,
  currentStreak,
  finishDistribution,
  opponentStats,
  overallRecord,
  recordsByMyBey,
  resolveMyBeyName,
  sortByDateDesc,
} from '../utils/matches';
import type { FinishType } from '../types';

const FINISH_TYPES: FinishType[] = ['xtreme', 'over', 'burst', 'spin'];

function FinishBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-[var(--muted)]">{count}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-[var(--muted)]/10">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}

function MatchesContent() {
  const { t } = useTranslation();
  const { database, loading, error } = useData();
  const { profile } = useProfileStore();
  const localCreations = useCreationsStore((s) => s.creations);

  const creations = useMemo(
    () => allCreations(profile, localCreations),
    [profile, localCreations]
  );

  if (loading) return <p className="text-[var(--muted)]">{t('errors.loadingDatabase')}</p>;
  if (error || !database) return <p className="text-red-600">{t('errors.failedDatabase')}</p>;
  if (!profile) return null;

  const matches = profile.matches;
  const beyName = (beyId: string) => database.beys.find((b) => b.id === beyId)?.name;
  const myBeyName = (ref: Parameters<typeof resolveMyBeyName>[0]) =>
    resolveMyBeyName(ref, beyName, creations);

  const overall = overallRecord(matches);
  const streak = currentStreak(matches);
  const byBey = recordsByMyBey(matches);
  const opponents = opponentStats(matches);
  const wonFinishes = finishDistribution(matches, 'win');
  const lostFinishes = finishDistribution(matches, 'loss');
  const wonTotal = FINISH_TYPES.reduce((s, f) => s + wonFinishes[f], 0);
  const lostTotal = FINISH_TYPES.reduce((s, f) => s + lostFinishes[f], 0);
  const sorted = sortByDateDesc(matches);
  const nemesis = opponents.filter((o) => o.losses > 0).sort((a, b) => a.winRate - b.winRate || b.matches - a.matches)[0];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t('matches.title')}</h1>

      {matches.length === 0 ? (
        <p className="text-[var(--muted)]">{t('matches.empty')}</p>
      ) : (
        <>
          <section>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
                <p className="text-sm text-[var(--muted)]">{t('matches.overall')}</p>
                <p className="text-2xl font-bold">{overall.wins}-{overall.losses}</p>
                <p className="text-xs text-[var(--muted)]">{overall.matches} {t('matches.battles')}</p>
              </div>
              <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
                <p className="text-sm text-[var(--muted)]">{t('matches.winRate')}</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {Math.round(overall.winRate * 100)}%
                </p>
              </div>
              <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
                <p className="text-sm text-[var(--muted)]">{t('matches.streak')}</p>
                <p className="text-2xl font-bold">
                  {streak.type === 'none' ? '-' : `${streak.count}${streak.type === 'win' ? 'W' : 'L'}`}
                </p>
              </div>
              <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
                <p className="text-sm text-[var(--muted)]">{t('matches.nemesis')}</p>
                <p className="truncate text-lg font-bold text-amber-600 dark:text-amber-400">
                  {nemesis ? nemesis.name : '-'}
                </p>
                {nemesis && (
                  <p className="text-xs text-[var(--muted)]">{nemesis.wins}-{nemesis.losses}</p>
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                {t('matches.finishWon')}
              </h2>
              <div className="space-y-2">
                {FINISH_TYPES.map((finish) => (
                  <FinishBar
                    key={finish}
                    label={t(`matches.finish.${finish}`)}
                    count={wonFinishes[finish]}
                    total={wonTotal}
                    color="bg-emerald-500"
                  />
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                {t('matches.finishLost')}
              </h2>
              <div className="space-y-2">
                {FINISH_TYPES.map((finish) => (
                  <FinishBar
                    key={finish}
                    label={t(`matches.finish.${finish}`)}
                    count={lostFinishes[finish]}
                    total={lostTotal}
                    color="bg-red-500"
                  />
                ))}
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold">{t('matches.byBey')}</h2>
            <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
              <div className="space-y-3">
                {byBey.map((entry) => (
                  <div key={entry.key} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {entry.ref.source === 'bey' ? (
                        <Link to={`/beys/${entry.ref.beyId}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                          {myBeyName(entry.ref)}
                        </Link>
                      ) : (
                        myBeyName(entry.ref)
                      )}
                    </span>
                    <span className="text-sm text-[var(--muted)]">{entry.wins}-{entry.losses}</span>
                    <div className="h-2 w-24 rounded-full bg-[var(--muted)]/10">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${entry.winRate * 100}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-sm text-[var(--muted)]">
                      {Math.round(entry.winRate * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold">{t('matches.opponents')}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {opponents.map((opponent) => (
                <div key={opponent.beyId ?? opponent.name} className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
                  {opponent.beyId ? (
                    <Link to={`/beys/${opponent.beyId}`} className="font-semibold hover:text-blue-600 dark:hover:text-blue-400">
                      {opponent.name}
                    </Link>
                  ) : (
                    <p className="font-semibold">{opponent.name}</p>
                  )}
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {opponent.wins}-{opponent.losses} · {Math.round(opponent.winRate * 100)}% {t('matches.winRate')}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold">{t('matches.history')}</h2>
            <div className="space-y-2">
              {sorted.map((match) => (
                <div
                  key={match.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl bg-[var(--surface)] p-3 shadow-sm text-sm"
                >
                  <span className="text-[var(--muted)]">{match.date}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      match.result === 'win'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    }`}
                  >
                    {match.result === 'win' ? t('matches.win') : t('matches.loss')}
                  </span>
                  <span className="font-medium">{myBeyName(match.myBey)}</span>
                  <span className="text-[var(--muted)]">{t('matches.vs')}</span>
                  <span className="font-medium">{match.opponent.name}</span>
                  {match.finishType && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                      {t(`matches.finish.${match.finishType}`)}
                    </span>
                  )}
                  {match.note && <span className="text-xs text-[var(--muted)]">— {match.note}</span>}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export function Matches() {
  return (
    <UnlockGate>
      <MatchesContent />
    </UnlockGate>
  );
}
