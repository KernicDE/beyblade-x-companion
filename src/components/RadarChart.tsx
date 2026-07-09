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
  const padding = 28;
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

  // Background sector triangles: each axis owns the 90° wedge pointing outward.
  const sectorPoints = axes.map((_, index) => {
    const prev = getPoint(5, (index + axes.length - 1) % axes.length);
    const next = getPoint(5, (index + 1) % axes.length);
    return `${center},${center} ${prev.x},${prev.y} ${next.x},${next.y}`;
  });

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
          </g>
        );
      })}

      {/* Colored background sectors: make dominant axis/axes visually obvious */}
      {axes.map((axis, index) => (
        <polygon
          key={`sector-${axis.key}`}
          points={sectorPoints[index]}
          fill={AXIS_COLORS[axis.key]}
          fillOpacity={0.12}
        />
      ))}

      <polygon
        points={polygonPoints}
        className="fill-white dark:fill-slate-800"
        fillOpacity={0.45}
        stroke="currentColor"
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

      {axes.map((axis, index) => {
        const label = getPoint(5.9, index);
        return (
          <text
            key={`label-${axis.key}`}
            x={label.x}
            y={label.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-sm font-bold"
            fill={AXIS_COLORS[axis.key]}
          >
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
}
