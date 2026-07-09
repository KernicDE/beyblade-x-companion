import { useParams } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { getPartById } from '../utils/data';
import { RadarChart } from '../components/RadarChart';
import type { PartCategory } from '../types';

const VALID_CATEGORIES: Array<PartCategory | 'launcher'> = [
  'blade',
  'assistBlade',
  'ratchet',
  'bit',
  'launcher',
];

export function PartDetail() {
  const { category, id } = useParams<{ category: string; id: string }>();
  const { database, loading, error } = useData();

  if (loading) return <p className="text-gray-600">Loading…</p>;
  if (error || !database) return <p className="text-red-600">Failed to load database.</p>;

  if (!category || !VALID_CATEGORIES.includes(category as PartCategory | 'launcher')) {
    return <p className="text-red-600">Invalid part category.</p>;
  }

  if (category === 'launcher') {
    const launcher = database.launchers.find((l) => l.id === id);
    if (!launcher) return <p className="text-red-600">Launcher not found.</p>;

    return (
      <div className="space-y-6">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">{launcher.name}</h1>
          <p className="text-sm text-gray-500">{launcher.releaseDate}</p>
          <p className="mt-4 text-gray-700">{launcher.description}</p>
          <div className="mt-4 text-sm">
            <span className="font-medium">Spin capability:{` `}</span>
            {launcher.spinCapability}
          </div>
        </div>
      </div>
    );
  }

  const part = getPartById(database, id ?? '', category as PartCategory);
  if (!part) return <p className="text-red-600">Part not found.</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">{part.name}</h1>
          {part.releaseWave && (
            <p className="text-sm text-gray-500">{part.releaseWave} · {part.releaseDate}</p>
          )}

          <p className="text-gray-700">{part.description}</p>

          <div className="space-y-2 text-sm">
            {part.officialStats.weightGrams && (
              <p>Weight: {part.officialStats.weightGrams}g</p>
            )}
            {part.officialStats.heightMm && (
              <p>Height: {part.officialStats.heightMm}mm</p>
            )}
            {part.officialStats.spinDirection && (
              <p>Spin direction: {part.officialStats.spinDirection}</p>
            )}
            {part.officialStats.typeTag && (
              <p>Type: {part.officialStats.typeTag}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Community Ratings</h2>
          <RadarChart ratings={part.ratings} size={280} />
          <p className="mt-4 text-xs text-gray-500">
            These ratings are community estimates, not official stats.
          </p>
        </div>
      </div>
    </div>
  );
}
