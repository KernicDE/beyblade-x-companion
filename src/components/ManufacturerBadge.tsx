interface ManufacturerBadgeProps {
  manufacturer: 'Takara Tomy' | 'Hasbro';
  size?: 'sm' | 'md';
}

export function ManufacturerBadge({ manufacturer, size = 'sm' }: ManufacturerBadgeProps) {
  const isTakara = manufacturer === 'Takara Tomy';
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold ${
        isTakara
          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      } ${size === 'sm' ? 'h-5 min-w-[1.25rem] px-1 text-[10px]' : 'h-6 min-w-[1.5rem] px-1.5 text-xs'}`}
      title={manufacturer}
    >
      {isTakara ? 'TT' : 'H'}
    </span>
  );
}
