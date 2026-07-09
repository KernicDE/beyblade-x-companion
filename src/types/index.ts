export type PartCategory = 'blade' | 'assistBlade' | 'ratchet' | 'bit';

export type Tier = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

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

export interface Profile {
  version: number;
  creations: Creation[];
}

export interface ComboParts {
  bladeId: string;
  assistBladeId?: string;
  ratchetId: string;
  bitId: string;
}
