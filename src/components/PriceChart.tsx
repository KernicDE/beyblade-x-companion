import { useMemo } from 'react';
import { useTranslation } from '../i18n';

interface PricePoint {
  date: string;
  priceEur: number | null;
  priceChf: number | null;
  priceUsd: number | null;
}

interface PriceChartProps {
  history: PricePoint[];
  currency?: 'EUR' | 'CHF' | 'USD';
  width?: number;
  height?: number;
}

export function PriceChart({ history, currency = 'EUR', width = 320, height = 160 }: PriceChartProps) {
  const { t } = useTranslation();

  const points = useMemo(() => {
    const currencyKey = currency === 'EUR' ? 'priceEur' : currency === 'CHF' ? 'priceChf' : 'priceUsd';
    return history
      .map((h) => ({ date: h.date, value: h[currencyKey] }))
      .filter((p): p is { date: string; value: number } => p.value != null && p.value > 0);
  }, [history, currency]);

  if (points.length < 2) {
    return <p className="text-sm text-[var(--muted)]">{t('beyDetail.noPriceHistory')}</p>;
  }

  const values = points.map((p) => p.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = 16;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const range = maxValue - minValue || 1;

  const xFor = (index: number) => padding + (index / (points.length - 1)) * chartWidth;
  const yFor = (value: number) => padding + chartHeight - ((value - minValue) / range) * chartHeight;

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(p.value)}`)
    .join(' ');

  const areaD = `${pathD} L ${xFor(points.length - 1)} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#priceGradient)" />
      <path d={pathD} fill="none" stroke="rgb(59, 130, 246)" strokeWidth="2" />
      {points.map((p, i) => (
        <g key={p.date}>
          <circle cx={xFor(i)} cy={yFor(p.value)} r="3" fill="rgb(59, 130, 246)" />
          <title>{p.date}: {currency} {p.value.toFixed(2)}</title>
        </g>
      ))}
      <text x={padding} y={padding - 4} className="text-[10px] fill-[var(--muted)]">
        {maxValue.toFixed(2)}
      </text>
      <text x={padding} y={height - 2} className="text-[10px] fill-[var(--muted)]">
        {minValue.toFixed(2)}
      </text>
    </svg>
  );
}
