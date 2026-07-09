import { useTranslation } from '../i18n';
import type { Part, PartCategory } from '../types';

interface PartPickerProps {
  category: PartCategory;
  label: string;
  parts: Part[];
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
  allowNone?: boolean;
}

const CATEGORY_KEYS: Record<PartCategory, string> = {
  blade: 'beyDetail.blade',
  assistBlade: 'beyDetail.assistBlade',
  ratchet: 'beyDetail.ratchet',
  bit: 'beyDetail.bit',
};

export function PartPicker({
  category,
  label,
  parts,
  selectedId,
  onSelect,
  allowNone = false,
}: PartPickerProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`picker-${category}`} className="text-sm font-medium text-[var(--muted)]">
        {label}
      </label>
      <select
        id={`picker-${category}`}
        value={selectedId ?? ''}
        onChange={(e) => {
          const value = e.target.value;
          onSelect(value === '' ? undefined : value);
        }}
        className="rounded-md border border-gray-300 dark:border-slate-600 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:border-blue-500 focus:outline-none"
      >
        {allowNone && (
          <option value="">
            {category === 'assistBlade'
              ? t('partDetail.noAssistBlade')
              : `${t('partDetail.no')} ${t(CATEGORY_KEYS[category])}`}
          </option>
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
