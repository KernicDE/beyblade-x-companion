import type {
  Blade,
  AssistBlade,
  Ratchet,
  Bit,
  Launcher,
  Bey,
  Part,
  PartCategory,
  ComboParts,
  Ratings,
  Tier,
} from '../types';

export interface Database {
  blades: Blade[];
  assistBlades: AssistBlade[];
  ratchets: Ratchet[];
  bits: Bit[];
  launchers: Launcher[];
  beys: Bey[];
}

async function loadJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function loadDatabase(): Promise<Database> {
  const base = import.meta.env.BASE_URL;
  const [blades, assistBlades, ratchets, bits, launchers, beys] = await Promise.all([
    loadJson<Blade[]>(`${base}data/blades.json`),
    loadJson<AssistBlade[]>(`${base}data/assistBlades.json`),
    loadJson<Ratchet[]>(`${base}data/ratchets.json`),
    loadJson<Bit[]>(`${base}data/bits.json`),
    loadJson<Launcher[]>(`${base}data/launchers.json`),
    loadJson<Bey[]>(`${base}data/beys.json`),
  ]);

  return { blades, assistBlades, ratchets, bits, launchers, beys };
}

export function getPartById(
  database: Database,
  id: string,
  category: PartCategory
): Part | undefined {
  switch (category) {
    case 'blade':
      return database.blades.find((p) => p.id === id);
    case 'assistBlade':
      return database.assistBlades.find((p) => p.id === id);
    case 'ratchet':
      return database.ratchets.find((p) => p.id === id);
    case 'bit':
      return database.bits.find((p) => p.id === id);
    default:
      return undefined;
  }
}

export function calculateComboRatings(
  database: Database,
  combo: ComboParts
): Ratings {
  const parts: Part[] = [
    getPartById(database, combo.bladeId, 'blade'),
    combo.assistBladeId
      ? getPartById(database, combo.assistBladeId, 'assistBlade')
      : undefined,
    getPartById(database, combo.ratchetId, 'ratchet'),
    getPartById(database, combo.bitId, 'bit'),
  ].filter((p): p is Part => p !== undefined);

  if (parts.length === 0) {
    return { attack: 0, defense: 0, stamina: 0, balance: 0 };
  }

  const sum = parts.reduce(
    (acc, part) => ({
      attack: acc.attack + part.ratings.attack,
      defense: acc.defense + part.ratings.defense,
      stamina: acc.stamina + part.ratings.stamina,
      balance: acc.balance + part.ratings.balance,
    }),
    { attack: 0, defense: 0, stamina: 0, balance: 0 }
  );

  return {
    attack: Number((sum.attack / parts.length).toFixed(2)),
    defense: Number((sum.defense / parts.length).toFixed(2)),
    stamina: Number((sum.stamina / parts.length).toFixed(2)),
    balance: Number((sum.balance / parts.length).toFixed(2)),
  };
}

export function getBeyParts(bey: Bey): ComboParts {
  return {
    bladeId: bey.bladeId,
    assistBladeId: bey.assistBladeId,
    ratchetId: bey.ratchetId,
    bitId: bey.bitId,
  };
}

export function isComboEstimated(database: Database, combo: ComboParts): boolean {
  const parts: Part[] = [
    getPartById(database, combo.bladeId, 'blade'),
    combo.assistBladeId
      ? getPartById(database, combo.assistBladeId, 'assistBlade')
      : undefined,
    getPartById(database, combo.ratchetId, 'ratchet'),
    getPartById(database, combo.bitId, 'bit'),
  ].filter((p): p is Part => p !== undefined);

  if (parts.length === 0) return false;
  return parts.some((p) => p.ratingsSource === 'estimated');
}

function getTypeScore(ratings: Ratings, typeTag?: string): number {
  const { attack, defense, stamina, balance } = ratings;
  switch (typeTag) {
    case 'Attack':
      return attack * 2 + defense + stamina + balance;
    case 'Defense':
      return defense * 2 + attack + stamina + balance;
    case 'Stamina':
      return stamina * 2 + attack + defense + balance;
    case 'Balance':
      return balance * 2 + attack + defense + stamina;
    default: {
      const values = Object.values(ratings);
      if (values.length === 0) return 0;
      const average = values.reduce((a, b) => a + b, 0) / values.length;
      const max = Math.max(...values);
      return (average + max) / 2;
    }
  }
}

export interface TypeScores {
  bey: Record<string, number[]>;
  blade: Record<string, number[]>;
  assistBlade: Record<string, number[]>;
  ratchet: Record<string, number[]>;
  bit: Record<string, number[]>;
}

export function buildTypeScores(database: Database): TypeScores {
  const beyScores: Record<string, number[]> = {};
  const bladeScores: Record<string, number[]> = {};
  const assistBladeScores: Record<string, number[]> = {};
  const ratchetScores: Record<string, number[]> = {};
  const bitScores: Record<string, number[]> = {};

  const addScore = (
    target: Record<string, number[]>,
    typeTag: string | undefined,
    ratings: Ratings
  ) => {
    if (!typeTag) return;
    const score = getTypeScore(ratings, typeTag);
    if (!target[typeTag]) target[typeTag] = [];
    target[typeTag].push(score);
  };

  database.beys.forEach((bey) => {
    const blade = database.blades.find((b) => b.id === bey.bladeId);
    const ratings = calculateComboRatings(database, getBeyParts(bey));
    addScore(beyScores, blade?.officialStats.typeTag, ratings);
  });

  database.blades.forEach((part) => addScore(bladeScores, part.officialStats.typeTag, part.ratings));
  database.assistBlades.forEach((part) => addScore(assistBladeScores, part.officialStats.typeTag, part.ratings));
  database.ratchets.forEach((part) => addScore(ratchetScores, part.officialStats.typeTag, part.ratings));
  database.bits.forEach((part) => addScore(bitScores, part.officialStats.typeTag, part.ratings));

  return { bey: beyScores, blade: bladeScores, assistBlade: assistBladeScores, ratchet: ratchetScores, bit: bitScores };
}

export function getPartTypeScores(
  typeScores: TypeScores,
  category: PartCategory
): Record<string, number[]> {
  switch (category) {
    case 'blade':
      return typeScores.blade;
    case 'assistBlade':
      return typeScores.assistBlade;
    case 'ratchet':
      return typeScores.ratchet;
    case 'bit':
      return typeScores.bit;
    default:
      return {};
  }
}

export function calculateTier(
  ratings: Ratings,
  typeTag?: string,
  typeScores?: Record<string, number[]>
): Tier {
  const score = getTypeScore(ratings, typeTag);

  if (typeTag && typeScores?.[typeTag]?.length) {
    const scores = typeScores[typeTag];
    const typeMax = Math.max(...scores);
    const typeMin = Math.min(...scores);
    const range = typeMax - typeMin;

    if (range === 0) return 'S';

    if (score >= typeMax - range * 0.1) return 'S';
    if (score >= typeMax - range * 0.2) return 'A';
    if (score >= typeMax - range * 0.3) return 'B';
    if (score >= typeMax - range * 0.4) return 'C';
    return 'F';
  }

  if (score >= 4.25) return 'S';
  if (score >= 3.75) return 'A';
  if (score >= 3.25) return 'B';
  if (score >= 2.25) return 'C';
  return 'F';
}
