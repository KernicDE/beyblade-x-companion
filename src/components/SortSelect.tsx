import { useTranslation } from '../i18n';

type SortKey = 'name' | 'releaseDate' | 'type' | 'batch' | 'tier' | 'attack' | 'defense' | 'stamina' | 'balance';

interface SortSelectProps {
  value: SortKey;
  onChange: (value: SortKey) => void;
}

const OPTIONS: { key: SortKey; labelKey: string }[] = [
  { key: 'name', labelKey: 'sort.name' },
  { key: 'releaseDate', labelKey: 'sort.releaseDate' },
  { key: 'type', labelKey: 'sort.type' },
  { key: 'batch', labelKey: 'sort.batch' },
  { key: 'tier', labelKey: 'sort.tier' },
  { key: 'attack', labelKey: 'sort.attack' },
  { key: 'defense', labelKey: 'sort.defense' },
  { key: 'stamina', labelKey: 'sort.stamina' },
  { key: 'balance', labelKey: 'sort.balance' },
];

export function SortSelect({ value, onChange }: SortSelectProps) {
  const { t } = useTranslation();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SortKey)}
      className="rounded-md border border-gray-300 dark:border-slate-600 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:border-blue-500 focus:outline-none"
    >
      {OPTIONS.map((opt) => (
        <option key={opt.key} value={opt.key}>
          {t(opt.labelKey)}
        </option>
      ))}
    </select>
  );
}

export type { SortKey };
