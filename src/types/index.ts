export type PartCategory = 'blade' | 'assistBlade' | 'ratchet' | 'bit';

export type Tier = 'S' | 'A' | 'B' | 'C' | 'F';

export interface Ratings {
  attack: number;
  defense: number;
  stamina: number;
  balance: number;
}

export interface OfficialStats {
  weightGrams?: number;
  heightMm?: number;
  spinDirection?: 'right' | 'left' | 'both';
  typeTag?: string;
}

export interface LocalizedString {
  en: string;
  de: string;
}

export interface Part {
  id: string;
  category: PartCategory;
  name: string;
  manufacturer: 'Takara Tomy' | 'Hasbro';
  imageUrl: string;
  releaseDate: string;
  releaseWave: string;
  description: LocalizedString;
  assessment: LocalizedString;
  officialStats: OfficialStats;
  ratings: Ratings;
  ratingsDisclaimer: true;
  ratingsSource?: 'community' | 'estimated';
  tier?: Tier;
}

export type Blade = Part & { category: 'blade' };
export type AssistBlade = Part & { category: 'assistBlade' };
export type Ratchet = Part & { category: 'ratchet' };
export type Bit = Part & { category: 'bit' };

export interface Launcher {
  id: string;
  name: string;
  manufacturer: 'Takara Tomy' | 'Hasbro';
  imageUrl: string;
  releaseDate: string;
  description: LocalizedString;
  assessment: LocalizedString;
  spinCapability: 'right' | 'left' | 'both';
  ratingsSource?: 'community' | 'estimated';
  tier?: Tier;
}

export interface Bey {
  id: string;
  name: string;
  manufacturer: 'Takara Tomy' | 'Hasbro';
  imageUrl: string;
  releaseDate: string;
  releaseWave: string;
  priceJpy?: number;
  priceUsd?: number;
  priceEur?: number;
  bladeId: string;
  assistBladeId?: string;
  ratchetId: string;
  bitId: string;
  assessment: LocalizedString;
  ratingsSource?: 'community' | 'estimated';
  tier?: Tier;
}

export interface Creation {
  id: string;
  name: string;
  note?: string;
  bladeId: string;
  assistBladeId?: string;
  ratchetId: string;
  bitId: string;
  createdAt: string;
  updatedAt: string;
}

export type FinishType = 'xtreme' | 'over' | 'burst' | 'spin';

export interface OwnedBey {
  beyId: string;
  purchaseDate?: string;
  shop?: string;
  /** Canonical price in EUR. CHF purchases are converted at the purchase-date rate on data entry. */
  priceEur?: number;
  /** Original CHF amount, kept for transparency when the purchase was made in CHF. */
  priceChf?: number;
  setName?: string;
  personalRatings?: Ratings;
  note?: string;
}

export interface OwnedPart {
  partId: string;
  category: PartCategory;
  obtainedFrom?: string;
  purchaseDate?: string;
  personalRatings?: Ratings;
  note?: string;
}

export type MyBeyRef =
  | { source: 'bey'; beyId: string }
  | { source: 'creation'; creationId: string };

export interface MatchOpponent {
  name: string;
  beyId?: string;
  combo?: ComboParts;
}

export interface Match {
  id: string;
  date: string;
  myBey: MyBeyRef;
  opponent: MatchOpponent;
  result: 'win' | 'loss';
  finishType?: FinishType;
  note?: string;
}

export interface PersonalProfile {
  version: 1;
  username?: string;
  ownedBeys: OwnedBey[];
  ownedParts: OwnedPart[];
  creations: Creation[];
  matches: Match[];
}

export interface CreationsExport {
  version: number;
  username?: string;
  creations: Creation[];
}

export interface ComboParts {
  bladeId: string;
  assistBladeId?: string;
  ratchetId: string;
  bitId: string;
}
