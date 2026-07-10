import { describe, it, expect } from 'vitest';
import { compressCreation, decompressCreation, compressProfile, decompressProfile } from './links';
import type { Creation, Profile } from '../types';

const mockCreation: Creation = {
  id: 'creation-1',
  name: 'Test Combo',
  note: 'A note',
  bladeId: 'blade-a',
  ratchetId: 'ratchet-a',
  bitId: 'bit-a',
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-01T00:00:00.000Z',
};

const mockProfile: Profile = {
  version: 2,
  username: 'Test User',
  ownedBeyIds: [],
  ownedPartIds: [],
  creations: [mockCreation],
};

describe('link compression', () => {
  it('round-trips a creation', () => {
    const compressed = compressCreation(mockCreation);
    const decompressed = decompressCreation(compressed);
    expect(decompressed).toEqual(mockCreation);
  });

  it('round-trips a profile', () => {
    const compressed = compressProfile(mockProfile);
    const decompressed = decompressProfile(compressed);
    expect(decompressed).toEqual(mockProfile);
  });

  it('returns null for malformed creation payload', () => {
    const decompressed = decompressCreation('not-valid');
    expect(decompressed).toBeNull();
  });

  it('returns null for malformed profile payload', () => {
    const decompressed = decompressProfile('not-valid');
    expect(decompressed).toBeNull();
  });
});
