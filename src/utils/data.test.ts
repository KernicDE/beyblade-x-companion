import { describe, it, expect } from 'vitest';
import { calculateComboRatings } from './data';
import type { Database } from './data';

const mockDatabase: Database = {
  blades: [
    {
      id: 'blade-a',
      category: 'blade',
      name: 'Blade A',
      manufacturer: 'Takara Tomy',
      imageUrl: '',
      releaseDate: '2023-01-01',
      releaseWave: 'BX-01',
      description: { en: '', de: '' },
      assessment: { en: '', de: '' },
      officialStats: {},
      ratings: { attack: 4, defense: 2, stamina: 2, balance: 3 },
      ratingsDisclaimer: true,
    },
  ],
  assistBlades: [
    {
      id: 'assist-a',
      category: 'assistBlade',
      name: 'Assist A',
      manufacturer: 'Takara Tomy',
      imageUrl: '',
      releaseDate: '2023-01-01',
      releaseWave: 'BX-02',
      description: { en: '', de: '' },
      assessment: { en: '', de: '' },
      officialStats: {},
      ratings: { attack: 2, defense: 2, stamina: 2, balance: 3 },
      ratingsDisclaimer: true,
    },
  ],
  ratchets: [
    {
      id: 'ratchet-a',
      category: 'ratchet',
      name: 'Ratchet A',
      manufacturer: 'Takara Tomy',
      imageUrl: '',
      releaseDate: '2023-01-01',
      releaseWave: 'BX-03',
      description: { en: '', de: '' },
      assessment: { en: '', de: '' },
      officialStats: {},
      ratings: { attack: 3, defense: 3, stamina: 3, balance: 3 },
      ratingsDisclaimer: true,
    },
  ],
  bits: [
    {
      id: 'bit-a',
      category: 'bit',
      name: 'Bit A',
      manufacturer: 'Takara Tomy',
      imageUrl: '',
      releaseDate: '2023-01-01',
      releaseWave: 'BX-04',
      description: { en: '', de: '' },
      assessment: { en: '', de: '' },
      officialStats: {},
      ratings: { attack: 1, defense: 4, stamina: 4, balance: 3 },
      ratingsDisclaimer: true,
    },
  ],
  launchers: [],
  beys: [],
  meta: {
    topCombos: [],
    metaParts: [],
    recommendedPurchases: [],
  },
};

describe('calculateComboRatings', () => {
  it('averages ratings across all selected parts', () => {
    const ratings = calculateComboRatings(mockDatabase, {
      bladeId: 'blade-a',
      assistBladeId: 'assist-a',
      ratchetId: 'ratchet-a',
      bitId: 'bit-a',
    });

    expect(ratings.attack).toBe(2.5);
    expect(ratings.defense).toBe(2.75);
    expect(ratings.stamina).toBe(2.75);
    expect(ratings.balance).toBe(3);
  });

  it('ignores missing optional assist blade', () => {
    const ratings = calculateComboRatings(mockDatabase, {
      bladeId: 'blade-a',
      ratchetId: 'ratchet-a',
      bitId: 'bit-a',
    });

    expect(ratings.attack).toBeCloseTo(2.67, 2);
    expect(ratings.defense).toBeCloseTo(3, 2);
    expect(ratings.stamina).toBeCloseTo(3, 2);
    expect(ratings.balance).toBe(3);
  });

  it('returns zeros when no parts are selected', () => {
    const ratings = calculateComboRatings(mockDatabase, {
      bladeId: '',
      ratchetId: '',
      bitId: '',
    });

    expect(ratings).toEqual({ attack: 0, defense: 0, stamina: 0, balance: 0 });
  });
});
