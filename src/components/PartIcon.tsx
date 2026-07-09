interface PartIconProps {
  category: 'blade' | 'assistBlade' | 'ratchet' | 'bit' | 'launcher' | 'bey';
  size?: number;
  className?: string;
}

export function PartIcon({ category, size = 48, className = '' }: PartIconProps) {
  const common = `w-[${size}px] h-[${size}px] text-gray-400 ${className}`;

  switch (category) {
    case 'blade':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 12 L18 6" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
      );
    case 'assistBlade':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={common}>
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="3" strokeDasharray="2 2" />
        </svg>
      );
    case 'ratchet':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={common}>
          <rect x="6" y="6" width="12" height="12" rx="2" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'bit':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={common}>
          <circle cx="12" cy="10" r="5" />
          <path d="M12 15 L12 20" />
          <path d="M9 20 L15 20" />
        </svg>
      );
    case 'launcher':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={common}>
          <rect x="4" y="8" width="12" height="8" rx="1" />
          <path d="M16 12 L21 12" />
          <circle cx="19" cy="12" r="1.5" fill="currentColor" />
        </svg>
      );
    case 'bey':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 4 L14 8 L12 8 Z" fill="currentColor" />
        </svg>
      );
  }
}
