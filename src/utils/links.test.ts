import { describe, it, expect } from 'vitest';
import { compressBuild, decompressBuild, compressProfile, decompressProfile } from './links';
import LZString from 'lz-string';
import type { Build, BuildsExport } from '../types';

const mockBuild: Build = {
  id: 'build-1',
  name: 'Test Combo',
  note: 'A note',
  bladeId: 'blade-a',
  ratchetId: 'ratchet-a',
  bitId: 'bit-a',
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-01T00:00:00.000Z',
};

const mockProfile: BuildsExport = {
  version: 2,
  username: 'Test User',
  builds: [mockBuild],
};

describe('link compression', () => {
  it('round-trips a build', () => {
    const compressed = compressBuild(mockBuild);
    const decompressed = decompressBuild(compressed);
    expect(decompressed).toEqual(mockBuild);
  });

  it('round-trips a profile', () => {
    const compressed = compressProfile(mockProfile);
    const decompressed = decompressProfile(compressed);
    expect(decompressed).toEqual(mockProfile);
  });

  it('accepts legacy export payloads with a creations field', () => {
    const legacy = { version: 1, username: 'Test User', creations: [mockBuild] };
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(legacy));
    const decompressed = decompressProfile(compressed);
    expect(decompressed).toEqual({ version: 1, username: 'Test User', builds: [mockBuild] });
  });

  it('returns null for malformed build payload', () => {
    const decompressed = decompressBuild('not-valid');
    expect(decompressed).toBeNull();
  });

  it('returns null for malformed profile payload', () => {
    const decompressed = decompressProfile('not-valid');
    expect(decompressed).toBeNull();
  });
});
