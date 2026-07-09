interface ManufacturerBadgeProps {
  manufacturer: 'Takara Tomy' | 'Hasbro';
  size?: 'sm' | 'md';
}

export function ManufacturerBadge({ manufacturer, size = 'sm' }: ManufacturerBadgeProps) {
  const isTakara = manufacturer === 'Takara Tomy';
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${
        isTakara
          ? 'bg-red-100 text-red-800'
          : 'bg-blue-100 text-blue-800'
      } ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}`}
    >
      {manufacturer}
    </span>
  );
}
