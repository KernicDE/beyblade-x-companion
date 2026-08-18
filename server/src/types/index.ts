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

export interface LocalizedList {
  en: string[];
  de: string[];
}

export interface BeyHighlights {
  pro: LocalizedList;
  con: LocalizedList;
  trivia: LocalizedList;
}

export interface Part {
  id: string;
  category: PartCategory;
  name: string;
  manufacturer: 'Takara Tomy' | 'Hasbro' | null;
  imageUrl: string | null;
  releaseDate: string | null;
  releaseWave: string | null;
  description: LocalizedString | null;
  assessment: LocalizedString | null;
  officialStats: OfficialStats | null;
  ratingsSource: 'community' | 'estimated' | null;
  tier: Tier | null;
  customLine: number;
  baselineRatings: Ratings | null;
  status: 'pending' | 'approved' | 'rejected';
  suggestedBy: string | null;
  moderatorNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export type Blade = Part & { category: 'blade' };
export type AssistBlade = Part & { category: 'assistBlade' };
export type Ratchet = Part & { category: 'ratchet' };
export type Bit = Part & { category: 'bit' };

export interface Bey {
  id: string;
  name: string;
  manufacturer: 'Takara Tomy' | 'Hasbro' | null;
  imageUrl: string | null;
  releaseDate: string | null;
  releaseWave: string | null;
  priceJpy: number | null;
  priceUsd: number | null;
  priceEur: number | null;
  bladeId: string;
  assistBladeId: string | null;
  ratchetId: string;
  bitId: string;
  assessment: LocalizedString | null;
  highlights: BeyHighlights | null;
  status: 'pending' | 'approved' | 'rejected';
  suggestedBy: string | null;
  moderatorNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export type Role = 'Council' | 'Referee' | 'Blader' | 'Rookie Blader';

export interface User {
  id: string;
  username: string;
  email: string | null;
  passwordHash: string;
  role: Role;
  isBanned: number;
  banReason: string | null;
  bannedAt: string | null;
  bannedBy: string | null;
  totpSecret: string | null;
  totpEnabled: number;
  totpRecoveryCodes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PublicUser = Omit<User, 'passwordHash' | 'totpSecret' | 'totpRecoveryCodes'>;

export interface Catalog {
  blades: Part[];
  assistBlades: Part[];
  ratchets: Part[];
  bits: Part[];
  beys: Bey[];
}

export interface PartRating {
  id: string;
  userId: string;
  partId: string;
  attack: number;
  defense: number;
  stamina: number;
  balance: number;
  countsInAverage: number;
  createdAt: string;
  updatedAt: string;
}

export interface BeyRating {
  id: string;
  userId: string;
  beyId: string;
  attack: number;
  defense: number;
  stamina: number;
  balance: number;
  countsInAverage: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  targetType: 'bey' | 'part';
  targetId: string;
  text: string;
  deletedAt: string | null;
  deletedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BeyBarcode {
  id: string;
  code: string;
  format: string | null;
  manufacturer: string | null;
  beyId: string;
  source: string | null;
  createdBy: string | null;
  createdAt: string;
}
