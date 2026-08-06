import type { Blade, AssistBlade, Ratchet, Bit, Ratings, Tier, OwnedPart, ComboParts } from '../types';
import type { Database } from './data';
import { calculateComboRatings, calculateTier, getTypeScore } from './data';

export type DeckFocus = 'auto' | 'balanced' | 'attack' | 'defense' | 'stamina';

export interface DeckPartCombo {
  combo: ComboParts;
  ratings: Ratings;
  score: number;
  tier: Tier;
  bladeName: string;
  assistBladeName?: string;
  ratchetName: string;
  bitName: string;
  typeTag?: string;
}

export interface Deck {
  beys: DeckPartCombo[];
  score: number;
  distinctTypeTags: number;
}

interface PartPool {
  blades: Blade[];
  assistBlades: AssistBlade[];
  ratchets: Ratchet[];
  bits: Bit[];
}

function dedupeByName<T extends { name: string }>(parts: T[]): T[] {
  const seen = new Set<string>();
  return parts.filter((p) => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });
}

export function buildOwnedPartPool(database: Database, ownedParts: OwnedPart[]): PartPool {
  const bladeIds = new Set(
    ownedParts.filter((p) => p.category === 'blade').map((p) => p.partId)
  );
  const assistBladeIds = new Set(
    ownedParts.filter((p) => p.category === 'assistBlade').map((p) => p.partId)
  );
  const ratchetIds = new Set(
    ownedParts.filter((p) => p.category === 'ratchet').map((p) => p.partId)
  );
  const bitIds = new Set(ownedParts.filter((p) => p.category === 'bit').map((p) => p.partId));

  return {
    blades: dedupeByName(database.blades.filter((p) => bladeIds.has(p.id))),
    assistBlades: dedupeByName(database.assistBlades.filter((p) => assistBladeIds.has(p.id))),
    ratchets: dedupeByName(database.ratchets.filter((p) => ratchetIds.has(p.id))),
    bits: dedupeByName(database.bits.filter((p) => bitIds.has(p.id))),
  };
}

export function scoreCombo(
  ratings: Ratings,
  typeTag: string | undefined,
  focus: DeckFocus
): number {
  return scoreByFocus(ratings, typeTag, focus);
}

function scoreByFocus(ratings: Ratings, typeTag: string | undefined, focus: DeckFocus): number {
  if (focus === 'auto' || focus === 'balanced') {
    return getTypeScore(ratings, typeTag);
  }
  const primary = ratings[focus];
  const others = Object.values(ratings).filter((_, i) => Object.keys(ratings)[i] !== focus);
  const avgOthers = others.reduce((a, b) => a + b, 0) / (others.length || 1);
  return primary * 3 + avgOthers;
}

export function enumerateCombos(pool: PartPool, focus: DeckFocus): DeckPartCombo[] {
  const combos: DeckPartCombo[] = [];

  for (const blade of pool.blades) {
    const baseAssistOptions: (AssistBlade | undefined)[] = pool.assistBlades.length
      ? pool.assistBlades
      : [undefined];
    const assistOptions = blade.customLine
      ? baseAssistOptions
      : [undefined];

    for (const assistBlade of assistOptions) {
      for (const ratchet of pool.ratchets) {
        for (const bit of pool.bits) {
          const combo: ComboParts = {
            bladeId: blade.id,
            assistBladeId: assistBlade?.id,
            ratchetId: ratchet.id,
            bitId: bit.id,
          };
          const ratings = calculateComboRatings({ ...pool, beys: [], launchers: [], meta: { topCombos: [], metaParts: [], recommendedPurchases: [] } } as Database, combo);
          const typeTag = blade.officialStats.typeTag;
          combos.push({
            combo,
            ratings,
            score: scoreByFocus(ratings, typeTag, focus),
            tier: calculateTier(ratings, typeTag),
            bladeName: blade.name,
            assistBladeName: assistBlade?.name,
            ratchetName: ratchet.name,
            bitName: bit.name,
            typeTag,
          });
        }
      }
    }
  }

  return combos.sort((a, b) => b.score - a.score);
}

function comboPartNames(combo: DeckPartCombo): string[] {
  const names = [combo.bladeName, combo.ratchetName, combo.bitName];
  if (combo.assistBladeName) names.push(combo.assistBladeName);
  return names;
}

function areDisjoint(a: DeckPartCombo, b: DeckPartCombo): boolean {
  const namesA = new Set(comboPartNames(a));
  return !comboPartNames(b).some((name) => namesA.has(name));
}

export function buildDecks(
  database: Database,
  ownedParts: OwnedPart[],
  slotFocuses: [DeckFocus, DeckFocus, DeckFocus] = ['auto', 'auto', 'auto'],
  topCount = 3,
  candidateLimit = 100
): Deck[] {
  const pool = buildOwnedPartPool(database, ownedParts);

  if (pool.blades.length === 0 || pool.ratchets.length === 0 || pool.bits.length === 0) {
    return [];
  }

  const baseCombos = enumerateCombos(pool, 'auto');
  const candidates = baseCombos.slice(0, Math.min(candidateLimit, baseCombos.length));

  // Pre-compute per-slot scores for each candidate
  const slotScores = candidates.map((combo) =>
    slotFocuses.map((focus) => scoreByFocus(combo.ratings, combo.typeTag, focus))
  );

  const decks: Deck[] = [];

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      if (!areDisjoint(candidates[i], candidates[j])) continue;
      for (let k = j + 1; k < candidates.length; k++) {
        if (!areDisjoint(candidates[i], candidates[k])) continue;
        if (!areDisjoint(candidates[j], candidates[k])) continue;

        const beys = [candidates[i], candidates[j], candidates[k]];
        const typeTags = new Set(beys.map((b) => b.typeTag).filter(Boolean));
        decks.push({
          beys,
          score: slotScores[i][0] + slotScores[j][1] + slotScores[k][2],
          distinctTypeTags: typeTags.size,
        });
      }
    }
  }

  decks.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.distinctTypeTags - a.distinctTypeTags;
  });

  return decks.slice(0, topCount);
}
