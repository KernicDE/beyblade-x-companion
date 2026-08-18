import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { useAuthStore } from '../stores/auth';
import { useCollectionStore } from '../stores/collection';
import { useMatchesStore } from '../stores/matches';
import { useBuildsStore } from '../stores/builds';
import { PartIcon } from '../components/PartIcon';
import { useTranslation } from '../i18n';
import {
  currentStreak,
  overallRecord,
  resolveMyBeyName,
  sortByDateDesc,
} from '../utils/matches';

export function Home() {
  const { t } = useTranslation();
  const { database } = useData();
  const { user } = useAuthStore();
  const { ownedBeys, ownedParts, fetch: fetchCollection } = useCollectionStore();
  const { matches, fetch: fetchMatches } = useMatchesStore();
  const { builds, fetch: fetchBuilds } = useBuildsStore();

  useEffect(() => {
    if (user) {
      void fetchCollection();
      void fetchMatches();
      void fetchBuilds();
    }
  }, [user, fetchCollection, fetchMatches, fetchBuilds]);

  if (!database) return null;

  const overall = overallRecord(matches);
  const streak = currentStreak(matches);
  const recentMatches = sortByDateDesc(matches).slice(0, 5);
  const recentBeys = [...ownedBeys]
    .sort((a, b) => (b.purchaseDate ?? '').localeCompare(a.purchaseDate ?? ''))
    .slice(0, 4);
  const beyName = (beyId: string) => database.beys.find((b) => b.id === beyId)?.name;

  const quickLinks = [
    { to: '/collection', label: t('home.links.collection') },
    { to: '/matches', label: t('home.links.matches') },
    { to: '/builder', label: t('home.links.builder') },
    { to: '/builds', label: t('home.links.builds') },
    { to: '/simulator', label: t('home.links.simulator') },
    { to: '/parts', label: t('home.links.parts') },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-sm">
        <h1 className="text-3xl font-bold">{user ? t('home.greeting', { name: user.username }) : t('app.title')}</h1>
        <p className="mt-2 text-blue-100">{t('home.tagline')}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/20"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/collection" className="rounded-xl bg-[var(--surface)] p-4 shadow-sm transition hover:shadow-md">
            <p className="text-sm text-[var(--muted)]">{t('home.ownedBeys')}</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{ownedBeys.length}</p>
          </Link>
          <Link to="/collection" className="rounded-xl bg-[var(--surface)] p-4 shadow-sm transition hover:shadow-md">
            <p className="text-sm text-[var(--muted)]">{t('home.ownedParts')}</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{ownedParts.length}</p>
          </Link>
          <Link to="/matches" className="rounded-xl bg-[var(--surface)] p-4 shadow-sm transition hover:shadow-md">
            <p className="text-sm text-[var(--muted)]">{t('matches.overall')}</p>
            <p className="text-2xl font-bold">
              {overall.matches > 0 ? `${overall.wins}-${overall.losses}` : '-'}
            </p>
          </Link>
          <Link to="/matches" className="rounded-xl bg-[var(--surface)] p-4 shadow-sm transition hover:shadow-md">
            <p className="text-sm text-[var(--muted)]">{t('matches.streak')}</p>
            <p className="text-2xl font-bold">
              {streak.type === 'none' ? '-' : `${streak.count}${streak.type === 'win' ? 'W' : 'L'}`}
            </p>
          </Link>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t('home.recentlyAdded')}
          </h2>
          {recentBeys.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">{t('collection.empty')}</p>
          ) : (
            <div className="space-y-3">
              {recentBeys.map((owned) => {
                const bey = database.beys.find((b) => b.id === owned.beyId);
                return (
                  <div key={owned.id} className="flex items-center gap-3">
                    {bey?.imageUrl ? (
                      <img src={bey.imageUrl} alt="" className="h-10 w-10 rounded-lg object-contain" />
                    ) : (
                      <PartIcon category="bey" size={40} />
                    )}
                    <Link
                      to={`/beys/${owned.beyId}`}
                      className="min-w-0 flex-1 truncate text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {bey?.name ?? owned.beyId}
                    </Link>
                    {owned.purchaseDate && (
                      <span className="text-xs text-[var(--muted)]">{owned.purchaseDate}</span>
                    )}
                  </div>
                );
      })}
            </div>
          )}
        </section>

        <section className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t('home.recentMatches')}
          </h2>
          {recentMatches.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">{t('matches.empty')}</p>
          ) : (
            <div className="space-y-3">
              {recentMatches.map((match) => (
                <div key={match.id} className="flex items-center gap-2 text-sm">
                  <span
                    className={`w-6 rounded-full px-1 text-center text-xs font-bold ${
                      match.result === 'win'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    }`}
                  >
                    {match.result === 'win' ? 'W' : 'L'}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {resolveMyBeyName(match.myBey, beyName, builds, ownedBeys)}
                    <span className="text-[var(--muted)]"> {t('matches.vs')} </span>
                    {match.opponent.name}
                  </span>
                  <span className="text-xs text-[var(--muted)]">{match.date}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
