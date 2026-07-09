import { Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import type { Part } from '../types';
import { RatingBars } from '../components/RatingBars';
import { PartIcon } from '../components/PartIcon';
import { ManufacturerBadge } from '../components/ManufacturerBadge';

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
                <div className="flex items-start gap-4">
                  {part.imageUrl ? (
                    <img src={part.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  ) : (
                    <PartIcon category={part.category} size={56} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900">{part.name}</h3>
                      <ManufacturerBadge manufacturer={part.manufacturer} />
                    </div>
                    <p className="text-sm text-gray-500">{part.releaseWave}</p>
                    <div className="mt-2">
                      <RatingBars ratings={part.ratings} />
                    </div>
                  </div>
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
              <div className="flex items-center gap-4">
                {launcher.imageUrl ? (
                  <img src={launcher.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                ) : (
                  <PartIcon category="launcher" size={56} />
                )}
                <div>
                  <div className="flex items-start gap-2">
                    <h3 className="font-semibold text-gray-900">{launcher.name}</h3>
                    <ManufacturerBadge manufacturer={launcher.manufacturer} />
                  </div>
                  <p className="text-sm text-gray-500">{launcher.spinCapability} spin</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
