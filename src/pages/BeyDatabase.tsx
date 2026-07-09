import { Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { calculateComboRatings, getBeyParts } from '../utils/data';
import { RadarChart } from '../components/RadarChart';

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
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">{bey.name}</h2>
                  <p className="text-sm text-gray-500">{bey.releaseWave}</p>
                </div>
                <RadarChart ratings={ratings} size={80} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
