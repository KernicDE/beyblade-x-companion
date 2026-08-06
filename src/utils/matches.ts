import type { Build, FinishType, Match, MyBeyRef, OwnedBey, PersonalProfile } from '../types';

export interface WinLossRecord {
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
}

function emptyRecord(): WinLossRecord {
  return { matches: 0, wins: 0, losses: 0, winRate: 0 };
}

function addMatch(record: WinLossRecord, result: 'win' | 'loss'): void {
  record.matches += 1;
  if (result === 'win') record.wins += 1;
  else record.losses += 1;
  record.winRate = record.wins / record.matches;
}

function sortByDateAsc(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => a.date.localeCompare(b.date));
}

export function sortByDateDesc(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => b.date.localeCompare(a.date));
}

export function overallRecord(matches: Match[]): WinLossRecord {
  const record = emptyRecord();
  matches.forEach((match) => addMatch(record, match.result));
  return record;
}

export interface Streak {
  type: 'win' | 'loss' | 'none';
  count: number;
}

export function currentStreak(matches: Match[]): Streak {
  const sorted = sortByDateAsc(matches);
  if (sorted.length === 0) return { type: 'none', count: 0 };
  const last = sorted[sorted.length - 1].result;
  let count = 0;
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    if (sorted[i].result !== last) break;
    count += 1;
  }
  return { type: last, count };
}

export function myBeyKey(ref: MyBeyRef, ownedBeys: OwnedBey[] = []): string {
  if (ref.source === 'bey') return `bey:${ref.beyId}`;
  if (ref.source === 'creation') return `creation:${ref.creationId}`;
  // An ownedBey match counts toward its catalog bey.
  const beyId = ownedBeys.find((owned) => owned.id === ref.ownedBeyId)?.beyId;
  return beyId ? `bey:${beyId}` : `ownedBey:${ref.ownedBeyId}`;
}

export interface BeyRecordEntry extends WinLossRecord {
  key: string;
  ref: MyBeyRef;
}

export function recordsByMyBey(matches: Match[], ownedBeys: OwnedBey[] = []): BeyRecordEntry[] {
  const map = new Map<string, BeyRecordEntry>();
  matches.forEach((match) => {
    const key = myBeyKey(match.myBey, ownedBeys);
    let entry = map.get(key);
    if (!entry) {
      entry = { key, ref: match.myBey, ...emptyRecord() };
      map.set(key, entry);
    } else if (match.myBey.source === 'bey') {
      // Prefer the catalog-bey ref so grouped entries (e.g. ownedBey matches
      // merged into their catalog bey) can link to the bey detail page.
      entry.ref = match.myBey;
    }
    addMatch(entry, match.result);
  });
  return Array.from(map.values()).sort(
    (a, b) => b.matches - a.matches || b.winRate - a.winRate
  );
}

/** Record achieved *with* a specific catalog bey as my bey (including owned copies). */
export function recordWithBey(
  matches: Match[],
  beyId: string,
  ownedBeys: OwnedBey[] = []
): WinLossRecord {
  const record = emptyRecord();
  matches.forEach((match) => {
    if (match.myBey.source === 'bey' && match.myBey.beyId === beyId) {
      addMatch(record, match.result);
    } else if (match.myBey.source === 'ownedBey') {
      const ownedBeyId = match.myBey.ownedBeyId;
      const owned = ownedBeys.find((o) => o.id === ownedBeyId);
      if (owned?.beyId === beyId) addMatch(record, match.result);
    }
  });
  return record;
}

/** Record achieved *against* a specific catalog bey as opponent. */
export function recordAgainstBey(matches: Match[], beyId: string): WinLossRecord {
  const record = emptyRecord();
  matches.forEach((match) => {
    if (match.opponent.beyId === beyId) {
      addMatch(record, match.result);
    }
  });
  return record;
}

export type FinishDistribution = { [K in FinishType]: number };

export function finishDistribution(matches: Match[], result?: 'win' | 'loss'): FinishDistribution {
  const dist: FinishDistribution = { xtreme: 0, over: 0, burst: 0, spin: 0 };
  matches.forEach((match) => {
    if (result && match.result !== result) return;
    if (match.finishType) dist[match.finishType] += 1;
  });
  return dist;
}

export interface OpponentEntry extends WinLossRecord {
  name: string;
  beyId?: string;
}

export function opponentStats(matches: Match[]): OpponentEntry[] {
  const map = new Map<string, OpponentEntry>();
  matches.forEach((match) => {
    const key = match.opponent.beyId ?? match.opponent.name;
    let entry = map.get(key);
    if (!entry) {
      entry = {
        name: match.opponent.name,
        beyId: match.opponent.beyId,
        ...emptyRecord(),
      };
      map.set(key, entry);
    }
    addMatch(entry, match.result);
  });
  return Array.from(map.values()).sort(
    (a, b) => b.matches - a.matches || a.winRate - b.winRate
  );
}

/** Display name for my bey: catalog bey name, build name, or the raw id as fallback. */
export function resolveMyBeyName(
  ref: MyBeyRef,
  beyNameById: (beyId: string) => string | undefined,
  builds: Build[],
  ownedBeys: OwnedBey[] = []
): string {
  if (ref.source === 'bey') {
    return beyNameById(ref.beyId) ?? ref.beyId;
  }
  if (ref.source === 'ownedBey') {
    const beyId = ownedBeys.find((owned) => owned.id === ref.ownedBeyId)?.beyId;
    return (beyId && beyNameById(beyId)) ?? beyId ?? ref.ownedBeyId;
  }
  return builds.find((b) => b.id === ref.creationId)?.name ?? ref.creationId;
}

/**
 * Distinguishing label for a single owned copy, e.g. "Dran Sword (Shop A, 2026-01-01)".
 * Falls back to the note, then to the plain bey name, then to the catalog id.
 */
export function ownedBeyLabel(owned: OwnedBey, beyName?: string): string {
  const base = beyName ?? owned.beyId;
  const detail = [owned.shop, owned.purchaseDate].filter(Boolean).join(', ') || owned.note;
  return detail ? `${base} (${detail})` : base;
}

/** Serialize a MyBeyRef for use as a select-option value. */
export function myBeyRefValue(ref: MyBeyRef): string {
  if (ref.source === 'bey') return `bey:${ref.beyId}`;
  if (ref.source === 'ownedBey') return `ownedBey:${ref.ownedBeyId}`;
  return `creation:${ref.creationId}`;
}

/** Parse a value produced by myBeyRefValue back into a MyBeyRef. */
export function parseMyBeyRefValue(value: string): MyBeyRef | null {
  const sep = value.indexOf(':');
  if (sep <= 0) return null;
  const source = value.slice(0, sep);
  const id = value.slice(sep + 1);
  if (!id) return null;
  if (source === 'bey') return { source: 'bey', beyId: id };
  if (source === 'ownedBey') return { source: 'ownedBey', ownedBeyId: id };
  if (source === 'creation') return { source: 'creation', creationId: id };
  return null;
}

/** All builds that matches can reference: profile builds plus local drafts. */
export function allBuilds(profile: PersonalProfile | null, localBuilds: Build[]): Build[] {
  const seen = new Set<string>();
  const result: Build[] = [];
  [...(profile?.builds ?? []), ...localBuilds].forEach((build) => {
    if (!seen.has(build.id)) {
      seen.add(build.id);
      result.push(build);
    }
  });
  return result;
}
