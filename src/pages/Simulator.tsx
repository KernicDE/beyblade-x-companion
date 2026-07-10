import { useMemo, useState } from 'react';
import { useData } from '../hooks/useData';
import { useTranslation } from '../i18n';
import {
  calculateComboRatings,
  getBeyParts,
  getPartById,
  calculateTier,
  buildTypeScores,
} from '../utils/data';
import { RadarChart } from '../components/RadarChart';
import { RatingBars } from '../components/RatingBars';
import { PartIcon } from '../components/PartIcon';
import { TierBadge } from '../components/TierBadge';
import { SpinBadge } from '../components/SpinBadge';
import type { Bey, Ratings } from '../types';
import type { Database } from '../utils/data';

interface MatchupResult {
  winner: 'a' | 'b' | 'tie';
  aScore: number;
  bScore: number;
  reasons: string[];
  advantage: number;
}

function getTypeTag(database: Database, bey: Bey): string | undefined {
  return getPartById(database, bey.bladeId, 'blade')?.officialStats.typeTag;
}

function getSpinDirection(database: Database, bey: Bey): string | undefined {
  return getPartById(database, bey.bladeId, 'blade')?.officialStats.spinDirection;
}

function typeAdvantage(attackerType: string, defenderType: string): number {
  if (attackerType === defenderType) return 0;
  if (attackerType === 'Attack' && defenderType === 'Stamina') return 1;
  if (attackerType === 'Stamina' && defenderType === 'Defense') return 1;
  if (attackerType === 'Defense' && defenderType === 'Attack') return 1;
  if (attackerType === 'Balance') return 0.3;
  if (defenderType === 'Balance') return 0.3;
  return -1;
}

function simulateBattle(database: Database, a: Bey, b: Bey): MatchupResult {
  const aRatings = calculateComboRatings(database, getBeyParts(a));
  const bRatings = calculateComboRatings(database, getBeyParts(b));
  const aType = getTypeTag(database, a) ?? 'Balance';
  const bType = getTypeTag(database, b) ?? 'Balance';
  const aSpin = getSpinDirection(database, a) ?? 'right';
  const bSpin = getSpinDirection(database, b) ?? 'right';

  const spinBonus = aSpin === bSpin ? 0 : 0.5;

  const score = (r: Ratings, type: string, opponentType: string) => {
    let base = r.attack * 1.2 + r.defense * 1.1 + r.stamina * 1.0 + r.balance * 0.8;
    const typeAdv = typeAdvantage(type, opponentType);
    if (typeAdv > 0) {
      base += typeAdv * 2;
    } else if (typeAdv < 0) {
      base += typeAdv * 1.5;
    }
    return base + spinBonus;
  };

  const aScore = score(aRatings, aType, bType);
  const bScore = score(bRatings, bType, aType);

  const reasons: string[] = [];

  const typeAdvA = typeAdvantage(aType, bType);
  if (typeAdvA > 0) {
    reasons.push(`${a.name} (${aType}) hat einen Typ-Vorteil gegen ${b.name} (${bType}).`);
  } else if (typeAdvA < 0) {
    reasons.push(`${b.name} (${bType}) hat einen Typ-Vorteil gegen ${a.name} (${aType}).`);
  }

  if (aRatings.attack > bRatings.attack + 0.5) {
    reasons.push(`${a.name} ist deutlich stärker im Angriff.`);
  } else if (bRatings.attack > aRatings.attack + 0.5) {
    reasons.push(`${b.name} ist deutlich stärker im Angriff.`);
  }

  if (aRatings.defense > bRatings.defense + 0.5) {
    reasons.push(`${a.name} ist defensiv stabiler.`);
  } else if (bRatings.defense > aRatings.defense + 0.5) {
    reasons.push(`${b.name} ist defensiv stabiler.`);
  }

  if (aRatings.stamina > bRatings.stamina + 0.5) {
    reasons.push(`${a.name} hat mehr Ausdauer.`);
  } else if (bRatings.stamina > aRatings.stamina + 0.5) {
    reasons.push(`${b.name} hat mehr Ausdauer.`);
  }

  if (aSpin !== bSpin) {
    reasons.push('Unterschiedliche Drehrichtungen können den Kampf beeinflussen.');
  }

  if (reasons.length === 0) {
    reasons.push('Beide Beys sind relativ ausgeglichen.');
  }

  const diff = Math.abs(aScore - bScore);
  let winner: 'a' | 'b' | 'tie' = 'tie';
  if (diff > 0.5) {
    winner = aScore > bScore ? 'a' : 'b';
  }

  return {
    winner,
    aScore: Number(aScore.toFixed(1)),
    bScore: Number(bScore.toFixed(1)),
    reasons,
    advantage: diff,
  };
}

export function Simulator() {
  const { t } = useTranslation();
  const { database, loading, error } = useData();
  const [aId, setAId] = useState<string>('');
  const [bId, setBId] = useState<string>('');

  const typeScores = useMemo(() => (database ? buildTypeScores(database).bey : null), [database]);

  if (loading) return <p className="text-[var(--muted)]">{t('errors.loadingDatabase')}</p>;
  if (error || !database) return <p className="text-red-600">{t('errors.failedDatabase')}</p>;

  const sortedBeys = [...database.beys].sort((a, b) => a.name.localeCompare(b.name));
  const beyA = database.beys.find((b) => b.id === aId);
  const beyB = database.beys.find((b) => b.id === bId);

  const result = beyA && beyB ? simulateBattle(database, beyA, beyB) : null;
  const aRatings = beyA ? calculateComboRatings(database, getBeyParts(beyA)) : null;
  const bRatings = beyB ? calculateComboRatings(database, getBeyParts(beyB)) : null;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{t('simulator.title')}</h1>
        <p className="text-sm text-[var(--muted)]">{t('simulator.matchupHint')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-xl bg-[var(--surface)] p-4 shadow-sm">
          <label htmlFor="sim-a" className="block text-sm font-medium text-[var(--muted)]">{t('simulator.beyA')}</label>
          <select
            id="sim-a"
            value={aId}
            onChange={(e) => setAId(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-slate-600 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:border-blue-500 focus:outline-none"
          >
            <option value="">{t('simulator.selectBey')}</option>
            {sortedBeys.map((bey) => (
              <option key={bey.id} value={bey.id}>{bey.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2 rounded-xl bg-[var(--surface)] p-4 shadow-sm">
          <label htmlFor="sim-b" className="block text-sm font-medium text-[var(--muted)]">{t('simulator.beyB')}</label>
          <select
            id="sim-b"
            value={bId}
            onChange={(e) => setBId(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-slate-600 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:border-blue-500 focus:outline-none"
          >
            <option value="">{t('simulator.selectBey')}</option>
            {sortedBeys.map((bey) => (
              <option key={bey.id} value={bey.id}>{bey.name}</option>
            ))}
          </select>
        </div>
      </div>

      {result && beyA && beyB && aRatings && bRatings && (
        <div className="space-y-6">
          <div className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <div className="text-center">
                {beyA.imageUrl ? (
                  <img src={beyA.imageUrl} alt="" className="mx-auto h-20 w-20 rounded-xl object-contain" />
                ) : (
                  <PartIcon category="bey" size={80} className="mx-auto" />
                )}
                <p className="mt-2 font-semibold">{beyA.name}</p>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <TierBadge tier={calculateTier(aRatings, getTypeTag(database, beyA), typeScores || undefined)} size="sm" />
                  {getSpinDirection(database, beyA) && (
                    <SpinBadge spin={getSpinDirection(database, beyA)! as 'right' | 'left' | 'both'} size="sm" />
                  )}
                </div>
                <p className="mt-1 text-2xl font-bold">{result.aScore}</p>
              </div>

              <div className="text-2xl font-bold text-[var(--muted)]">{t('simulator.vs')}</div>

              <div className="text-center">
                {beyB.imageUrl ? (
                  <img src={beyB.imageUrl} alt="" className="mx-auto h-20 w-20 rounded-xl object-contain" />
                ) : (
                  <PartIcon category="bey" size={80} className="mx-auto" />
                )}
                <p className="mt-2 font-semibold">{beyB.name}</p>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <TierBadge tier={calculateTier(bRatings, getTypeTag(database, beyB), typeScores || undefined)} size="sm" />
                  {getSpinDirection(database, beyB) && (
                    <SpinBadge spin={getSpinDirection(database, beyB)! as 'right' | 'left' | 'both'} size="sm" />
                  )}
                </div>
                <p className="mt-1 text-2xl font-bold">{result.bScore}</p>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-lg font-semibold">
                {t('simulator.predictedWinner')}:{' '}
                <span
                  className={
                    result.winner === 'a'
                      ? 'text-blue-600 dark:text-blue-400'
                      : result.winner === 'b'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-[var(--muted)]'
                  }
                >
                  {result.winner === 'a' ? beyA.name : result.winner === 'b' ? beyB.name : t('simulator.tie')}
                </span>
              </p>
              <p className="text-sm text-[var(--muted)]">
                {t('simulator.advantage')}: {result.advantage.toFixed(1)} {result.winner === 'tie' ? '' : 'Punkte'}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">{t('simulator.reason')}</h2>
              <ul className="list-disc space-y-2 pl-5 text-sm">
                {result.reasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
                <h3 className="mb-2 text-center text-sm font-medium text-[var(--muted)]">{beyA.name}</h3>
                <div className="mx-auto w-full max-w-[200px]">
                  <RadarChart ratings={aRatings} size={200} />
                </div>
                <div className="mt-2">
                  <RatingBars ratings={aRatings} size="sm" />
                </div>
              </div>

              <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
                <h3 className="mb-2 text-center text-sm font-medium text-[var(--muted)]">{beyB.name}</h3>
                <div className="mx-auto w-full max-w-[200px]">
                  <RadarChart ratings={bRatings} size={200} />
                </div>
                <div className="mt-2">
                  <RatingBars ratings={bRatings} size="sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
