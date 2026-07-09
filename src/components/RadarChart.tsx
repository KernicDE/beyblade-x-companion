import type { Ratings } from '../types';

interface RadarChartProps {
  ratings: Ratings;
  size?: number;
  className?: string;
}

const AXES: { key: keyof Ratings; label: string }[] = [
  { key: 'attack', label: 'Attack' },
  { key: 'defense', label: 'Defense' },
  { key: 'stamina', label: 'Stamina' },
  { key: 'balance', label: 'Balance' },
];

export function RadarChart({
  ratings,
  size = 200,
  className = '',
}: RadarChartProps) {
  const padding = 24;
  const center = size / 2;
  const maxRadius = size / 2 - padding;
  const angleStep = (Math.PI * 2) / AXES.length;
  const startAngle = -Math.PI / 2;

  const getPoint = (value: number, index: number) => {
    const angle = startAngle + index * angleStep;
    const radius = (value / 5) * maxRadius;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  const points = AXES.map((axis, index) => getPoint(ratings[axis.key], index));
  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="img"
      aria-label={`Ratings: Attack ${ratings.attack}, Defense ${ratings.defense}, Stamina ${ratings.stamina}, Balance ${ratings.balance}`}
    >
      {[1, 2, 3, 4, 5].map((level) => {
        const levelPoints = AXES.map((_, index) => getPoint(level, index));
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

      {AXES.map((axis, index) => {
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
              className="text-xs fill-gray-600 dark:fill-gray-400"
            >
              {axis.label}
            </text>
          </g>
        );
      })}

      <polygon
        points={polygonPoints}
        fill="rgba(59, 130, 246, 0.25)"
        stroke="#3b82f6"
        strokeWidth={2}
      />

      {points.map((p, index) => (
        <circle
          key={index}
          cx={p.x}
          cy={p.y}
          r={3}
          fill="#3b82f6"
        />
      ))}
    </svg>
  );
}
