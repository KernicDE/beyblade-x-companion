import { useParams } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { calculateComboRatings, getBeyParts, getPartById } from '../utils/data';
import { RadarChart } from '../components/RadarChart';
import { PartIcon } from '../components/PartIcon';

export function BeyDetail() {
  const { id } = useParams<{ id: string }>();
  const { database, loading, error } = useData();

  if (loading) return <p className="text-gray-600">Loading…</p>;
  if (error || !database) return <p className="text-red-600">Failed to load database.</p>;

  const bey = database.beys.find((b) => b.id === id);
  if (!bey) return <p className="text-red-600">Bey not found.</p>;

  const parts = getBeyParts(bey);
  const blade = getPartById(database, parts.bladeId, 'blade');
  const assistBlade = parts.assistBladeId
    ? getPartById(database, parts.assistBladeId, 'assistBlade')
    : undefined;
  const ratchet = getPartById(database, parts.ratchetId, 'ratchet');
  const bit = getPartById(database, parts.bitId, 'bit');
  const ratings = calculateComboRatings(database, parts);

  return (
    <div className="space-y-6">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            {bey.imageUrl ? (
              <img src={bey.imageUrl} alt="" className="h-24 w-24 rounded-xl object-cover" />
            ) : (
              <PartIcon category="bey" size={96} />
            )}
            <div>
              <h1 className="text-2xl font-bold">{bey.name}</h1>
              <p className="text-sm text-gray-500">{bey.releaseWave} · {bey.releaseDate}</p>
            </div>
          </div>

          <p className="text-gray-700">{bey.assessment}</p>

          <div className="space-y-2 text-sm">
            <p>Manufacturer: {bey.manufacturer}</p>
            <h2 className="font-semibold">Parts</h2>
            <ul className="space-y-1">
              <li>Blade: {blade?.name ?? 'Unknown'}</li>
              {assistBlade && <li>Assist Blade: {assistBlade.name}</li>}
              <li>Ratchet: {ratchet?.name ?? 'Unknown'}</li>
              <li>Bit: {bit?.name ?? 'Unknown'}</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Community Ratings</h2>
          <RadarChart ratings={ratings} size={280} />
          <p className="mt-4 text-xs text-gray-500">
            Attack {ratings.attack} · Defense {ratings.defense} · Stamina {ratings.stamina} · Balance {ratings.balance}
          </p>
        </div>
      </div>
    </div>
  );
}
