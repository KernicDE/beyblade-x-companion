import type { Ratings } from '../types';

interface RatingBarsProps {
  ratings: Ratings;
  size?: 'sm' | 'md';
}

const LABELS: { key: keyof Ratings; label: string; color: string }[] = [
  { key: 'attack', label: 'Attack', color: 'bg-red-500' },
  { key: 'defense', label: 'Defense', color: 'bg-blue-500' },
  { key: 'stamina', label: 'Stamina', color: 'bg-green-500' },
  { key: 'balance', label: 'Balance', color: 'bg-purple-500' },
];

export function RatingBars({ ratings, size = 'sm' }: RatingBarsProps) {
  return (
    <div className="flex flex-col gap-1">
      {LABELS.map(({ key, label, color }) => {
        const value = ratings[key];
        return (
          <div key={key} className="flex items-center gap-2">
            <span className={`text-gray-600 ${size === 'sm' ? 'text-[10px] w-12' : 'text-xs w-14'}`}>
              {label}
            </span>
            <div className={`rounded-full bg-gray-200 ${size === 'sm' ? 'h-1.5 flex-1' : 'h-2 flex-1'}`}>
              <div
                className={`h-full rounded-full ${color}`}
                style={{ width: `${(value / 5) * 100}%` }}
              />
            </div>
            <span className={`text-gray-700 tabular-nums ${size === 'sm' ? 'text-[10px] w-4' : 'text-xs w-5'}`}>
              {value.toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
