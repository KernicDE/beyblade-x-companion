export type PartCategory = 'blade' | 'assistBlade' | 'ratchet' | 'bit';

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

export interface Part {
  id: string;
  category: PartCategory;
  name: string;
  manufacturer: 'Takara Tomy' | 'Hasbro';
  imageUrl: string;
  releaseDate: string;
  releaseWave: string;
  description: string;
  assessment: string;
  officialStats: OfficialStats;
  ratings: Ratings;
  ratingsDisclaimer: true;
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
  description: string;
  assessment: string;
  spinCapability: 'right' | 'left' | 'both';
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
  assessment: string;
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
