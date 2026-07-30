import { describe, it, expect } from 'vitest';
import {
  currentStreak,
  finishDistribution,
  opponentStats,
  overallRecord,
  recordAgainstBey,
  recordsByMyBey,
  recordWithBey,
  resolveMyBeyName,
} from './matches';
import type { Creation, Match } from '../types';

function makeMatch(overrides: Partial<Match>): Match {
  return {
    id: Math.random().toString(36).slice(2),
    date: '2026-01-01',
    myBey: { source: 'bey', beyId: 'bey-a' },
    opponent: { name: 'Opponent' },
    result: 'win',
    ...overrides,
  };
}

const matches: Match[] = [
  makeMatch({ date: '2026-01-01', result: 'win', finishType: 'xtreme' }),
  makeMatch({ date: '2026-01-02', result: 'win', finishType: 'over', opponent: { name: 'Foe', beyId: 'bey-b' } }),
  makeMatch({ date: '2026-01-03', result: 'loss', finishType: 'burst', myBey: { source: 'creation', creationId: 'c-1' } }),
  makeMatch({ date: '2026-01-04', result: 'win', finishType: 'spin', myBey: { source: 'creation', creationId: 'c-1' }, opponent: { name: 'Foe', beyId: 'bey-b' } }),
];

describe('match statistics', () => {
  it('computes the overall record', () => {
    const record = overallRecord(matches);
    expect(record).toEqual({ matches: 4, wins: 3, losses: 1, winRate: 0.75 });
  });

  it('computes the current streak', () => {
    expect(currentStreak(matches)).toEqual({ type: 'win', count: 1 });
    expect(currentStreak(matches.slice(0, 3))).toEqual({ type: 'loss', count: 1 });
    expect(currentStreak(matches.slice(0, 2))).toEqual({ type: 'win', count: 2 });
    expect(currentStreak([])).toEqual({ type: 'none', count: 0 });
  });

  it('computes records per own bey', () => {
    const byBey = recordsByMyBey(matches);
    expect(byBey).toHaveLength(2);
    const beyA = byBey.find((e) => e.key === 'bey:bey-a');
    const creation = byBey.find((e) => e.key === 'creation:c-1');
    expect(beyA).toMatchObject({ matches: 2, wins: 2, losses: 0 });
    expect(creation).toMatchObject({ matches: 2, wins: 1, losses: 1 });
  });

  it('computes records with and against a catalog bey', () => {
    expect(recordWithBey(matches, 'bey-a')).toMatchObject({ matches: 2, wins: 2 });
    expect(recordAgainstBey(matches, 'bey-b')).toMatchObject({ matches: 2, wins: 2, losses: 0 });
    expect(recordAgainstBey(matches, 'unknown')).toMatchObject({ matches: 0 });
  });

  it('computes finish distributions', () => {
    expect(finishDistribution(matches, 'win')).toEqual({ xtreme: 1, over: 1, burst: 0, spin: 1 });
    expect(finishDistribution(matches, 'loss')).toEqual({ xtreme: 0, over: 0, burst: 1, spin: 0 });
  });

  it('groups opponent stats by beyId or name', () => {
    const opponents = opponentStats(matches);
    const foe = opponents.find((o) => o.beyId === 'bey-b');
    const plain = opponents.find((o) => o.name === 'Opponent');
    expect(foe).toMatchObject({ matches: 2, wins: 2, losses: 0 });
    expect(plain).toMatchObject({ matches: 2, wins: 1, losses: 1 });
  });

  it('resolves display names for my bey', () => {
    const creations: Creation[] = [
      {
        id: 'c-1',
        name: 'My Combo',
        bladeId: 'blade-a',
        ratchetId: 'ratchet-a',
        bitId: 'bit-a',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const beyName = (id: string) => (id === 'bey-a' ? 'Dran Sword' : undefined);
    expect(resolveMyBeyName({ source: 'bey', beyId: 'bey-a' }, beyName, creations)).toBe('Dran Sword');
    expect(resolveMyBeyName({ source: 'creation', creationId: 'c-1' }, beyName, creations)).toBe('My Combo');
    expect(resolveMyBeyName({ source: 'creation', creationId: 'missing' }, beyName, creations)).toBe('missing');
  });
});
