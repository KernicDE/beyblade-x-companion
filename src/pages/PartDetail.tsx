import { useParams } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { getPartById } from '../utils/data';
import { RadarChart } from '../components/RadarChart';
import { PartIcon } from '../components/PartIcon';
import { ManufacturerBadge } from '../components/ManufacturerBadge';
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
          <div className="flex items-center gap-4">
            {launcher.imageUrl ? (
              <img src={launcher.imageUrl} alt="" className="h-24 w-24 rounded-xl object-cover" />
            ) : (
              <PartIcon category="launcher" size={96} />
            )}
            <div>
              <h1 className="text-2xl font-bold">{launcher.name}</h1>
              <p className="text-sm text-gray-500">{launcher.releaseDate}</p>
            </div>
          </div>
          <p className="mt-4 text-gray-700">{launcher.assessment}</p>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <ManufacturerBadge manufacturer={launcher.manufacturer} size="md" />
            <span>·</span>
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
          <div className="flex items-center gap-4">
            {part.imageUrl ? (
              <img src={part.imageUrl} alt="" className="h-24 w-24 rounded-xl object-cover" />
            ) : (
              <PartIcon category={part.category} size={96} />
            )}
            <div>
              <h1 className="text-2xl font-bold">{part.name}</h1>
              {part.releaseWave && (
                <p className="text-sm text-gray-500">{part.releaseWave} · {part.releaseDate}</p>
              )}
            </div>
          </div>

          <p className="text-gray-700">{part.assessment}</p>

          <div className="space-y-2 text-sm">
            <p><ManufacturerBadge manufacturer={part.manufacturer} size="md" /></p>
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
