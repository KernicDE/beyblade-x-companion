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

export interface MetaCombo {
  beyId: string;
  appearances: number;
  metaScore: number;
}

export interface MetaPart {
  partId: string;
  category: PartCategory;
  appearances: number;
}

export interface RecommendedPurchase {
  releaseWave: string;
  priority: number;
}

export interface MetaData {
  topCombos: MetaCombo[];
  metaParts: MetaPart[];
  recommendedPurchases: RecommendedPurchase[];
}

export interface Database {
  blades: Blade[];
  assistBlades: AssistBlade[];
  ratchets: Ratchet[];
  bits: Bit[];
  launchers: Launcher[];
  beys: Bey[];
  meta: MetaData;
}

export interface PriceMap {
  [releaseWave: string]: {
    jpy?: number;
    usd?: number;
    eur?: number;
  };
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
  const [blades, assistBlades, ratchets, bits, launchers, beys, prices, meta] = await Promise.all([
    loadJson<Blade[]>(`${base}data/blades.json`),
    loadJson<AssistBlade[]>(`${base}data/assistBlades.json`),
    loadJson<Ratchet[]>(`${base}data/ratchets.json`),
    loadJson<Bit[]>(`${base}data/bits.json`),
    loadJson<Launcher[]>(`${base}data/launchers.json`),
    loadJson<Bey[]>(`${base}data/beys.json`),
    loadJson<PriceMap>(`${base}data/prices.json`).catch(() => ({} as PriceMap)),
    loadJson<MetaData>(`${base}data/meta.json`).catch(() => ({
      topCombos: [],
      metaParts: [],
      recommendedPurchases: [],
    } as MetaData)),
  ]);

  const beysWithPrices = beys.map((bey) => {
    const price = prices[bey.releaseWave];
    if (!price) return bey;
    return {
      ...bey,
      priceJpy: price.jpy,
      priceUsd: price.usd,
      priceEur: price.eur,
    };
  });

  return { blades, assistBlades, ratchets, bits, launchers, beys: beysWithPrices, meta };
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
    (acc, part) => {
      const ratings = part.ratings;
      return {
        attack: acc.attack + ratings.attack,
        defense: acc.defense + ratings.defense,
        stamina: acc.stamina + ratings.stamina,
        balance: acc.balance + ratings.balance,
      };
    },
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

export function findBeysContainingPart(database: Database, partId: string): Bey[] {
  return database.beys.filter((bey) => {
    const parts = getBeyParts(bey);
    return (
      parts.bladeId === partId ||
      parts.assistBladeId === partId ||
      parts.ratchetId === partId ||
      parts.bitId === partId
    );
  });
}

export function getTypeScore(ratings: Ratings, typeTag?: string): number {
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
      // Untyped parts (e.g. ratchets): blend average and peak, scaled to the same 0–20 range.
      return ((average + max) / 2) * 4;
    }
  }
}

export function calculateTier(ratings: Ratings, typeTag?: string): Tier {
  // Absolute thresholds on the normalized type score (0–20 scale).
  // Relative-to-catalog tiering breaks down on small, personal catalogs.
  const score = getTypeScore(ratings, typeTag);
  const pct = score / 20;
  if (pct >= 0.8) return 'S';
  if (pct >= 0.7) return 'A';
  if (pct >= 0.6) return 'B';
  if (pct >= 0.5) return 'C';
  return 'F';
}
