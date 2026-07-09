interface FilterChipsProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  label?: string;
}

export function FilterChips({ options, selected, onChange, label }: FilterChipsProps) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  if (options.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {label && <span className="text-sm text-[var(--muted)]">{label}</span>}
      {options.map((value) => {
        const isSelected = selected.includes(value);
        return (
          <button
            key={value}
            type="button"
            onClick={() => toggle(value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              isSelected
                ? 'border-blue-500 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                : 'border-gray-300 dark:border-slate-600 bg-[var(--surface)] text-[var(--muted)] opacity-70 hover:bg-gray-50 dark:hover:bg-slate-800'
            }`}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}
