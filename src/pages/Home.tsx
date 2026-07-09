import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">
          Beyblade X Companion
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Browse official Beys and parts, build custom combinations, and share
          your creations — all offline in your browser.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link
            to="/beys"
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Browse Beys
          </Link>
          <Link
            to="/configurator"
            className="rounded-md bg-gray-200 px-4 py-2 text-gray-900 hover:bg-gray-300"
          >
            Open Configurator
          </Link>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { to: '/beys', label: 'Bey Database', desc: 'Official factory combos' },
          { to: '/parts', label: 'Parts Database', desc: 'Blades, ratchets, bits, launchers' },
          { to: '/configurator', label: 'Configurator', desc: 'Mix \u0026 match parts' },
          { to: '/profile', label: 'My Profile', desc: 'Saved creations' },
        ].map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="rounded-xl bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-gray-900">{card.label}</h2>
            <p className="mt-2 text-sm text-gray-600">{card.desc}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
