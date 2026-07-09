import { useParams } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { RadarChart } from '../components/RadarChart';
import { PartIcon } from '../components/PartIcon';
import { decompressCreation } from '../utils/links';
import { calculateComboRatings, getPartById } from '../utils/data';

export function View() {
  const { compressed } = useParams<{ compressed: string }>();
  const { database, loading, error } = useData();

  if (loading) return <p className="text-gray-600">Loading…</p>;
  if (error || !database) return <p className="text-red-600">Failed to load database.</p>;

  const creation = compressed ? decompressCreation(compressed) : null;
  if (!creation) {
    return <p className="text-red-600">Invalid or corrupted share link.</p>;
  }

  const blade = getPartById(database, creation.bladeId, 'blade');
  const assistBlade = creation.assistBladeId
    ? getPartById(database, creation.assistBladeId, 'assistBlade')
    : undefined;
  const ratchet = getPartById(database, creation.ratchetId, 'ratchet');
  const bit = getPartById(database, creation.bitId, 'bit');
  const ratings = calculateComboRatings(database, creation);

  return (
    <div className="space-y-6">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <PartIcon category="bey" size={96} />
            <div>
              <h1 className="text-2xl font-bold">{creation.name}</h1>
              {creation.note && <p className="text-gray-700">{creation.note}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold">Parts</h2>
            <ul className="space-y-1 text-sm">
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
