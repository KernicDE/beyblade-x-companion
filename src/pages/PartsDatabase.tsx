import { Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import type { Part } from '../types';
import { RadarChart } from '../components/RadarChart';

const CATEGORY_TITLES: Record<Part['category'], string> = {
  blade: 'Blades',
  assistBlade: 'Assist Blades',
  ratchet: 'Ratchets',
  bit: 'Bits',
};

export function PartsDatabase() {
  const { database, loading, error } = useData();

  if (loading) return <p className="text-gray-600">Loading database…</p>;
  if (error || !database) return <p className="text-red-600">Failed to load database.</p>;

  const groups: { category: Part['category']; parts: Part[] }[] = [
    { category: 'blade', parts: database.blades },
    { category: 'assistBlade', parts: database.assistBlades },
    { category: 'ratchet', parts: database.ratchets },
    { category: 'bit', parts: database.bits },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Parts Database</h1>

      {groups.map((group) => (
        <section key={group.category}>
          <h2 className="mb-4 text-xl font-semibold">{CATEGORY_TITLES[group.category]}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.parts.map((part) => (
              <Link
                key={part.id}
                to={`/parts/${part.category}/${part.id}`}
                className="rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{part.name}</h3>
                    <p className="text-sm text-gray-500">{part.releaseWave}</p>
                  </div>
                  <RadarChart ratings={part.ratings} size={64} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <section>
        <h2 className="mb-4 text-xl font-semibold">Launchers</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {database.launchers.map((launcher) => (
            <Link
              key={launcher.id}
              to={`/parts/launcher/${launcher.id}`}
              className="rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <h3 className="font-semibold text-gray-900">{launcher.name}</h3>
              <p className="text-sm text-gray-500">{launcher.spinCapability} spin</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
