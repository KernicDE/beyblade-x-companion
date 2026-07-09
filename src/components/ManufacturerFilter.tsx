import { ManufacturerBadge } from './ManufacturerBadge';

interface ManufacturerFilterProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  manufacturers?: string[];
}

const DEFAULT_MANUFACTURERS: string[] = ['Takara Tomy', 'Hasbro'];

export function ManufacturerFilter({
  selected,
  onChange,
  manufacturers = DEFAULT_MANUFACTURERS,
}: ManufacturerFilterProps) {
  const toggle = (m: string) => {
    if (selected.includes(m)) {
      onChange(selected.filter((x) => x !== m));
    } else {
      onChange([...selected, m]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {manufacturers.map((m) => {
        const isSelected = selected.includes(m);
        return (
          <button
            key={m}
            type="button"
            onClick={() => toggle(m)}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
              isSelected
                ? 'border-transparent bg-[var(--surface)] shadow-sm'
                : 'border-gray-300 bg-[var(--surface)] text-[var(--muted)] opacity-60 hover:bg-gray-50 dark:hover:bg-slate-800'
            }`}
          >
            <ManufacturerBadge manufacturer={m as 'Takara Tomy' | 'Hasbro'} />
          </button>
        );
      })}
    </div>
  );
}
