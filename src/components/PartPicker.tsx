import type { Part, PartCategory } from '../types';

interface PartPickerProps {
  category: PartCategory;
  label: string;
  parts: Part[];
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
  allowNone?: boolean;
}

const CATEGORY_LABELS: Record<PartCategory, string> = {
  blade: 'Blade',
  assistBlade: 'Assist Blade',
  ratchet: 'Ratchet',
  bit: 'Bit',
};

export function PartPicker({
  category,
  label,
  parts,
  selectedId,
  onSelect,
  allowNone = false,
}: PartPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`picker-${category}`} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <select
        id={`picker-${category}`}
        value={selectedId ?? ''}
        onChange={(e) => {
          const value = e.target.value;
          onSelect(value === '' ? undefined : value);
        }}
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      >
        {allowNone && (
          <option value="">No {CATEGORY_LABELS[category]}</option>
        )}
        {parts.map((part) => (
          <option key={part.id} value={part.id}>
            {part.name} ({part.releaseWave})
          </option>
        ))}
      </select>
    </div>
  );
}
