import { Link } from 'react-router-dom';
import { useTranslation } from '../i18n';

export function Home() {
  const { t } = useTranslation();

  const cards = [
    { to: '/beys', label: t('home.cards.beyDatabase'), desc: t('home.cards.beyDatabaseDesc') },
    { to: '/parts', label: t('home.cards.partsDatabase'), desc: t('home.cards.partsDatabaseDesc') },
    { to: '/configurator', label: t('home.cards.configurator'), desc: t('home.cards.configuratorDesc') },
    { to: '/profile', label: t('home.cards.myProfile'), desc: t('home.cards.myProfileDesc') },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-[var(--surface)] p-8 shadow-sm transition-colors">
        <h1 className="text-3xl font-bold text-[var(--text)]">
          {t('app.title')}
        </h1>
        <p className="mt-4 text-lg text-[var(--muted)]">
          {t('home.tagline')}
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link
            to="/beys"
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            {t('home.browseBeys')}
          </Link>
          <Link
            to="/configurator"
            className="rounded-md bg-gray-200 px-4 py-2 text-gray-900 hover:bg-gray-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
          >
            {t('home.openConfigurator')}
          </Link>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="rounded-xl bg-[var(--surface)] p-6 shadow-sm transition hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-[var(--text)]">{card.label}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{card.desc}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
