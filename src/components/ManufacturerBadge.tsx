interface ManufacturerBadgeProps {
  manufacturer: 'Takara Tomy' | 'Hasbro';
  size?: 'sm' | 'md';
}

export function ManufacturerBadge({ manufacturer, size = 'sm' }: ManufacturerBadgeProps) {
  const isTakara = manufacturer === 'Takara Tomy';
  const icon = isTakara ? (
    <svg viewBox="0 0 24 24" className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} fill="currentColor" aria-hidden="true">
      <text x="2" y="18" fontSize="14" fontWeight="bold">TT</text>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} fill="currentColor" aria-hidden="true">
      <text x="5" y="18" fontSize="16" fontWeight="bold">H</text>
    </svg>
  );
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${
        isTakara
          ? 'bg-red-100 text-red-800'
          : 'bg-blue-100 text-blue-800'
      } ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}`}
      title={manufacturer}
    >
      {icon}
      <span>{manufacturer}</span>
    </span>
  );
}
