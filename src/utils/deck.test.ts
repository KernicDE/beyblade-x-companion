import { describe, it, expect } from 'vitest';
import { buildOwnedPartPool, buildDecks, enumerateCombos } from './deck';
import type { Database } from './data';
import type { OwnedPart } from '../types';

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
      officialStats: { typeTag: 'Attack' },
      ratings: { attack: 5, defense: 1, stamina: 1, balance: 2 },
      ratingsDisclaimer: true,
    },
    {
      id: 'blade-b',
      category: 'blade',
      name: 'Blade B',
      manufacturer: 'Takara Tomy',
      imageUrl: '',
      releaseDate: '2023-01-01',
      releaseWave: 'BX-02',
      description: { en: '', de: '' },
      assessment: { en: '', de: '' },
      officialStats: { typeTag: 'Stamina' },
      ratings: { attack: 1, defense: 2, stamina: 5, balance: 2 },
      ratingsDisclaimer: true,
    },
    {
      id: 'blade-cx',
      category: 'blade',
      name: 'Blade CX',
      manufacturer: 'Takara Tomy',
      imageUrl: '',
      releaseDate: '2023-01-01',
      releaseWave: 'BX-03',
      description: { en: '', de: '' },
      assessment: { en: '', de: '' },
      officialStats: { typeTag: 'Defense' },
      ratings: { attack: 2, defense: 3, stamina: 2, balance: 3 },
      ratingsDisclaimer: true,
      customLine: true,
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
      releaseWave: 'BX-04',
      description: { en: '', de: '' },
      assessment: { en: '', de: '' },
      officialStats: {},
      ratings: { attack: 1, defense: 1, stamina: 1, balance: 1 },
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
      releaseWave: 'BX-05',
      description: { en: '', de: '' },
      assessment: { en: '', de: '' },
      officialStats: {},
      ratings: { attack: 3, defense: 3, stamina: 3, balance: 3 },
      ratingsDisclaimer: true,
    },
    {
      id: 'ratchet-b',
      category: 'ratchet',
      name: 'Ratchet B',
      manufacturer: 'Takara Tomy',
      imageUrl: '',
      releaseDate: '2023-01-01',
      releaseWave: 'BX-06',
      description: { en: '', de: '' },
      assessment: { en: '', de: '' },
      officialStats: {},
      ratings: { attack: 2, defense: 4, stamina: 3, balance: 3 },
      ratingsDisclaimer: true,
    },
    {
      id: 'ratchet-c',
      category: 'ratchet',
      name: 'Ratchet C',
      manufacturer: 'Takara Tomy',
      imageUrl: '',
      releaseDate: '2023-01-01',
      releaseWave: 'BX-07',
      description: { en: '', de: '' },
      assessment: { en: '', de: '' },
      officialStats: {},
      ratings: { attack: 1, defense: 2, stamina: 5, balance: 2 },
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
      releaseWave: 'BX-08',
      description: { en: '', de: '' },
      assessment: { en: '', de: '' },
      officialStats: { typeTag: 'Attack' },
      ratings: { attack: 5, defense: 0, stamina: 0, balance: 1 },
      ratingsDisclaimer: true,
    },
    {
      id: 'bit-b',
      category: 'bit',
      name: 'Bit B',
      manufacturer: 'Takara Tomy',
      imageUrl: '',
      releaseDate: '2023-01-01',
      releaseWave: 'BX-09',
      description: { en: '', de: '' },
      assessment: { en: '', de: '' },
      officialStats: { typeTag: 'Stamina' },
      ratings: { attack: 0, defense: 1, stamina: 5, balance: 1 },
      ratingsDisclaimer: true,
    },
    {
      id: 'bit-c',
      category: 'bit',
      name: 'Bit C',
      manufacturer: 'Takara Tomy',
      imageUrl: '',
      releaseDate: '2023-01-01',
      releaseWave: 'BX-10',
      description: { en: '', de: '' },
      assessment: { en: '', de: '' },
      officialStats: { typeTag: 'Defense' },
      ratings: { attack: 1, defense: 5, stamina: 0, balance: 1 },
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

const allOwnedParts: OwnedPart[] = [
  { partId: 'blade-a', category: 'blade' },
  { partId: 'blade-b', category: 'blade' },
  { partId: 'blade-cx', category: 'blade' },
  { partId: 'assist-a', category: 'assistBlade' },
  { partId: 'ratchet-a', category: 'ratchet' },
  { partId: 'ratchet-b', category: 'ratchet' },
  { partId: 'ratchet-c', category: 'ratchet' },
  { partId: 'bit-a', category: 'bit' },
  { partId: 'bit-b', category: 'bit' },
  { partId: 'bit-c', category: 'bit' },
];

describe('buildOwnedPartPool', () => {
  it('deduplicates owned parts by name', () => {
    const duplicatedParts: OwnedPart[] = [
      ...allOwnedParts,
      { partId: 'ratchet-a-copy', category: 'ratchet' },
    ];
    const pool = buildOwnedPartPool(mockDatabase, duplicatedParts);
    expect(pool.ratchets.length).toBe(3);
    expect(pool.ratchets.some((r) => r.name === 'Ratchet A')).toBe(true);
  });
});

describe('enumerateCombos', () => {
  it('includes assist-blade variants only for custom line blades', () => {
    const pool = buildOwnedPartPool(mockDatabase, allOwnedParts);
    const combos = enumerateCombos(pool, 'auto');

    const basicBladeCombos = combos.filter((c) => c.bladeName === 'Blade A');
    expect(basicBladeCombos.every((c) => !c.assistBladeName)).toBe(true);

    const customBladeCombos = combos.filter((c) => c.bladeName === 'Blade CX');
    expect(customBladeCombos.some((c) => c.assistBladeName === 'Assist A')).toBe(true);
  });
});

describe('buildDecks', () => {
  it('returns three disjoint combos', () => {
    const decks = buildDecks(mockDatabase, allOwnedParts, ['auto', 'auto', 'auto'], 3, 200);
    expect(decks.length).toBeGreaterThan(0);
    const deck = decks[0];
    expect(deck.beys.length).toBe(3);

    const names = new Set<string>();
    for (const combo of deck.beys) {
      for (const name of [
        combo.bladeName,
        combo.assistBladeName,
        combo.ratchetName,
        combo.bitName,
      ].filter((name): name is string => !!name)) {
        expect(names.has(name)).toBe(false);
        names.add(name);
      }
    }
  });

  it('prefers the selected focus axis', () => {
    const attackDecks = buildDecks(mockDatabase, allOwnedParts, ['attack', 'auto', 'auto'], 1, 200);
    const staminaDecks = buildDecks(mockDatabase, allOwnedParts, ['stamina', 'auto', 'auto'], 1, 200);

    expect(attackDecks.length).toBe(1);
    expect(staminaDecks.length).toBe(1);

    const attackScore = attackDecks[0].score;
    const staminaScore = staminaDecks[0].score;
    expect(attackScore).not.toEqual(staminaScore);
  });

  it('returns an empty array when not enough parts are owned', () => {
    const decks = buildDecks(
      mockDatabase,
      [{ partId: 'blade-a', category: 'blade' }],
      ['auto', 'auto', 'auto'],
      3,
      200
    );
    expect(decks).toEqual([]);
  });
});
