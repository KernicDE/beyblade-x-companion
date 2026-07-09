import { useTranslation } from '../i18n';
import type { Ratings } from '../types';

interface RatingBarsProps {
  ratings: Ratings;
  size?: 'sm' | 'md';
}

const COLORS: Record<keyof Ratings, string> = {
  attack: 'bg-red-500',
  defense: 'bg-blue-500',
  stamina: 'bg-green-500',
  balance: 'bg-purple-500',
};

export function RatingBars({ ratings, size = 'sm' }: RatingBarsProps) {
  const { t } = useTranslation();
  const labels: { key: keyof Ratings; label: string }[] = [
    { key: 'attack', label: t('partDetail.attack') },
    { key: 'defense', label: t('partDetail.defense') },
    { key: 'stamina', label: t('partDetail.stamina') },
    { key: 'balance', label: t('partDetail.balance') },
  ];

  return (
    <div className="flex flex-col gap-1">
      {labels.map(({ key, label }) => {
        const value = ratings[key];
        return (
          <div key={key} className="flex items-center gap-2">
            <span className={`text-gray-600 dark:text-gray-400 ${size === 'sm' ? 'text-[10px] w-12' : 'text-xs w-14'}`}>
              {label}
            </span>
            <div className={`rounded-full bg-gray-200 dark:bg-gray-700 ${size === 'sm' ? 'h-1.5 flex-1' : 'h-2 flex-1'}`}>
              <div
                className={`h-full rounded-full ${COLORS[key]}`}
                style={{ width: `${(value / 5) * 100}%` }}
              />
            </div>
            <span className={`text-gray-700 dark:text-gray-300 tabular-nums ${size === 'sm' ? 'text-[10px] w-4' : 'text-xs w-5'}`}>
              {value.toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
