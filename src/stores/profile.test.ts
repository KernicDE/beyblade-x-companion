import { describe, it, expect } from 'vitest';
import { isPersonalProfile, migrateProfile } from './profile';

describe('profile migration', () => {
  it('migrates a version-1 profile to version 2', () => {
    const v1 = {
      version: 1,
      username: 'Tester',
      ownedBeys: [{ beyId: 'bey-a' }, { beyId: 'bey-a', purchaseDate: '2026-01-01' }],
      ownedParts: [],
      creations: [{ id: 'c-1', name: 'Combo' }],
      matches: [{ id: 'm-1', myBey: { source: 'bey', beyId: 'bey-a' } }],
    };
    const migrated = migrateProfile(v1);

    expect(migrated.version).toBe(2);
    expect(migrated.creations).toBeUndefined();
    expect(migrated.builds).toEqual([{ id: 'c-1', name: 'Combo' }]);
    const ownedBeys = migrated.ownedBeys as { id: string; beyId: string }[];
    expect(ownedBeys).toHaveLength(2);
    ownedBeys.forEach((owned) => expect(typeof owned.id).toBe('string'));
    expect(new Set(ownedBeys.map((o) => o.id)).size).toBe(2);
    // Old matches keep their 'bey' source untouched.
    expect(migrated.matches).toEqual(v1.matches);
    expect(isPersonalProfile(migrated)).toBe(true);
  });

  it('keeps existing ownedBey ids during migration', () => {
    const v1 = {
      version: 1,
      ownedBeys: [{ id: 'kept-id', beyId: 'bey-a' }],
      ownedParts: [],
      builds: [],
      matches: [],
    };
    const migrated = migrateProfile(v1);
    expect((migrated.ownedBeys as { id: string }[])[0].id).toBe('kept-id');
  });

  it('leaves version-2 profiles unchanged', () => {
    const v2 = {
      version: 2,
      ownedBeys: [{ id: 'x', beyId: 'bey-a' }],
      ownedParts: [],
      builds: [],
      matches: [],
    };
    expect(migrateProfile(v2)).toEqual(v2);
  });

  it('validates only version-2 profiles', () => {
    expect(
      isPersonalProfile({ version: 1, ownedBeys: [], ownedParts: [], creations: [], matches: [] })
    ).toBe(false);
    expect(
      isPersonalProfile({ version: 2, ownedBeys: [], ownedParts: [], builds: [], matches: [] })
    ).toBe(true);
  });
});
