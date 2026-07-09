import type { Tier } from '../types';

interface TierBadgeProps {
  tier: Tier;
  size?: 'sm' | 'md';
}

const TIER_COLORS: Record<Tier, string> = {
  S: 'bg-yellow-400 text-yellow-950',
  A: 'bg-green-500 text-white',
  B: 'bg-emerald-400 text-emerald-950',
  C: 'bg-blue-400 text-blue-950',
  F: 'bg-red-500 text-white',
};

export function TierBadge({ tier, size = 'sm' }: TierBadgeProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded font-bold ${TIER_COLORS[tier]} ${
        size === 'sm' ? 'h-5 min-w-[1.25rem] px-1 text-xs' : 'h-6 min-w-[1.5rem] px-1.5 text-sm'
      }`}
      title={`Tier ${tier}`}
    >
      {tier}
    </span>
  );
}
