import { useMemo } from 'react';
import { useTranslation } from '../i18n';
import type { Ratings } from '../types';

interface RadarChartProps {
  ratings: Ratings;
  size?: number;
  className?: string;
}

const AXIS_COLORS: Record<string, string> = {
  attack: '#ef4444',
  defense: '#3b82f6',
  stamina: '#22c55e',
  balance: '#a855f7',
};

function mixColor(ratings: Ratings) {
  const entries = Object.entries(AXIS_COLORS);
  const weights = entries.map(([key]) => ratings[key as keyof Ratings] / 5);
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;

  let r = 0;
  let g = 0;
  let b = 0;
  entries.forEach(([key], index) => {
    const hex = AXIS_COLORS[key];
    const wr = parseInt(hex.slice(1, 3), 16);
    const wg = parseInt(hex.slice(3, 5), 16);
    const wb = parseInt(hex.slice(5, 7), 16);
    const w = weights[index] / totalWeight;
    r += wr * w;
    g += wg * w;
    b += wb * w;
  });

  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

export function RadarChart({
  ratings,
  size = 240,
  className = '',
}: RadarChartProps) {
  const { t } = useTranslation();

  const axes = useMemo(
    () => [
      { key: 'attack' as const, label: t('radar.attack') },
      { key: 'defense' as const, label: t('radar.defense') },
      { key: 'stamina' as const, label: t('radar.stamina') },
      { key: 'balance' as const, label: t('radar.balance') },
    ],
    [t]
  );

  const viewSize = 240;
  const padding = 24;
  const center = viewSize / 2;
  const maxRadius = viewSize / 2 - padding;
  const angleStep = (Math.PI * 2) / axes.length;
  const startAngle = -Math.PI / 2;

  const getPoint = (value: number, index: number) => {
    const angle = startAngle + index * angleStep;
    const radius = (value / 5) * maxRadius;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  const points = axes.map((axis, index) => getPoint(ratings[axis.key], index));
  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const gradientId = `radar-gradient-${ratings.attack}-${ratings.defense}-${ratings.stamina}-${ratings.balance}`.replace(/\./g, '-');
  const mixedColor = mixColor(ratings);

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${viewSize} ${viewSize}`}
      style={{ maxWidth: size }}
      className={className}
      role="img"
      aria-label={`${t('partDetail.attack')} ${ratings.attack}, ${t('partDetail.defense')} ${ratings.defense}, ${t('partDetail.stamina')} ${ratings.stamina}, ${t('partDetail.balance')} ${ratings.balance}`}
    >
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.35)" />
          <stop offset="100%" stopColor={mixedColor} stopOpacity={0.55} />
        </radialGradient>
      </defs>

      {[1, 2, 3, 4, 5].map((level) => {
        const levelPoints = axes.map((_, index) => getPoint(level, index));
        const d = levelPoints
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
          .join(' ')
          .concat(' Z');
        return (
          <path
            key={level}
            d={d}
            fill="none"
            className="stroke-gray-200 dark:stroke-gray-700"
            strokeWidth={1}
          />
        );
      })}

      {axes.map((axis, index) => {
        const end = getPoint(5, index);
        const label = getPoint(5.8, index);
        return (
          <g key={axis.key}>
            <line
              x1={center}
              y1={center}
              x2={end.x}
              y2={end.y}
              className="stroke-gray-200 dark:stroke-gray-700"
              strokeWidth={1}
            />
            <text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-sm font-semibold"
              fill={AXIS_COLORS[axis.key]}
            >
              {axis.label}
            </text>
          </g>
        );
      })}

      <polygon
        points={polygonPoints}
        fill={`url(#${gradientId})`}
        stroke={mixedColor}
        strokeWidth={2}
      />

      {points.map((p, index) => {
        const axis = axes[index];
        return (
          <circle
            key={index}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={AXIS_COLORS[axis.key]}
            stroke="#fff"
            strokeWidth={1}
          />
        );
      })}
    </svg>
  );
}
