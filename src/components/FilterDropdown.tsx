import { useState, useRef, useEffect } from 'react';

interface FilterDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function FilterDropdown({ label, options, selected, onChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  if (options.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
          selected.length > 0
            ? 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
            : 'border-[var(--muted)]/30 bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--muted)]/10'
        }`}
      >
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-xs text-white">{selected.length}</span>
        )}
        <span className="text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 min-w-[12rem] overflow-auto rounded-lg border border-[var(--muted)]/30 bg-[var(--surface)] p-2 shadow-lg">
          {options.map((value) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-[var(--text)] hover:bg-[var(--muted)]/10"
            >
              <input
                type="checkbox"
                checked={selected.includes(value)}
                onChange={() => toggle(value)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{value}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
