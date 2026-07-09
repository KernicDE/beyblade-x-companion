import { Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { calculateComboRatings, getBeyParts } from '../utils/data';
import { RatingBars } from '../components/RatingBars';
import { PartIcon } from '../components/PartIcon';

export function BeyDatabase() {
  const { database, loading, error } = useData();

  if (loading) return <p className="text-gray-600">Loading database…</p>;
  if (error || !database) return <p className="text-red-600">Failed to load database.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bey Database</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {database.beys.map((bey) => {
          const ratings = calculateComboRatings(database, getBeyParts(bey));
          return (
            <Link
              key={bey.id}
              to={`/beys/${bey.id}`}
              className="rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                {bey.imageUrl ? (
                  <img src={bey.imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
                ) : (
                  <PartIcon category="bey" size={64} />
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-gray-900">{bey.name}</h2>
                  <p className="text-sm text-gray-500">{bey.releaseWave}</p>
                  <div className="mt-3">
                    <RatingBars ratings={ratings} />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
