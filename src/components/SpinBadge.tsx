interface SpinBadgeProps {
  spin: 'right' | 'left' | 'both' | undefined;
  size?: 'sm' | 'md';
}

export function SpinBadge({ spin, size = 'sm' }: SpinBadgeProps) {
  if (!spin) return null;

  const label = spin === 'both' ? 'R/L' : spin === 'right' ? 'R' : 'L';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gray-100 font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-200 ${
        size === 'sm' ? 'h-5 w-5 text-[10px]' : 'h-6 w-6 text-xs'
      }`}
      title={spin === 'both' ? 'Right / Left spin' : `${spin === 'right' ? 'Right' : 'Left'} spin`}
    >
      {label}
    </span>
  );
}
