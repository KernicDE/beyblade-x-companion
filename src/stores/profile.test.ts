import { describe, it, expect, beforeEach } from 'vitest';
import { isPersonalProfile, migrateProfile, useProfileStore } from './profile';
import type { PersonalProfile } from '../types';

function testProfile(): PersonalProfile {
  return {
    version: 2,
    ownedBeys: [
      { id: 'owned-1', beyId: 'bey-a', shop: 'Shop A' },
      { id: 'owned-2', beyId: 'bey-a', shop: 'Shop B' },
    ],
    ownedParts: [],
    builds: [],
    matches: [],
  };
}

describe('owned bey store operations', () => {
  beforeEach(() => {
    localStorage.clear();
    useProfileStore.setState({ profile: testProfile(), status: 'unlocked', remembered: false });
  });

  it('addOwnedBey assigns a unique id and allows duplicate catalog beys', () => {
    const first = useProfileStore.getState().addOwnedBey({ beyId: 'bey-a', priceEur: 12.99 });
    const second = useProfileStore.getState().addOwnedBey({ beyId: 'bey-a' });

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first!.id).toBeTruthy();
    expect(first!.id).not.toBe(second!.id);

    const { ownedBeys } = useProfileStore.getState().profile!;
    expect(ownedBeys).toHaveLength(4);
    expect(new Set(ownedBeys.map((o) => o.id)).size).toBe(4);
    expect(ownedBeys[2]).toMatchObject({ beyId: 'bey-a', priceEur: 12.99 });
  });

  it('addOwnedBey returns null without an unlocked profile', () => {
    useProfileStore.setState({ profile: null, status: 'locked' });
    expect(useProfileStore.getState().addOwnedBey({ beyId: 'bey-a' })).toBeNull();
  });

  it('updateOwnedBey patches a single copy by id and keeps its id', () => {
    useProfileStore.getState().updateOwnedBey('owned-1', { shop: 'Neuer Shop', note: 'N' });

    const { ownedBeys } = useProfileStore.getState().profile!;
    expect(ownedBeys.find((o) => o.id === 'owned-1')).toMatchObject({
      id: 'owned-1',
      beyId: 'bey-a',
      shop: 'Neuer Shop',
      note: 'N',
    });
    // The other copy of the same catalog bey stays untouched.
    expect(ownedBeys.find((o) => o.id === 'owned-2')).toMatchObject({ shop: 'Shop B' });
  });

  it('updateOwnedBey cannot overwrite the exemplar id', () => {
    useProfileStore.getState().updateOwnedBey('owned-1', { id: 'hijacked' } as never);
    const { ownedBeys } = useProfileStore.getState().profile!;
    expect(ownedBeys.find((o) => o.beyId === 'bey-a')!.id).toBe('owned-1');
  });

  it('removeOwnedBey removes only the matching copy', () => {
    useProfileStore.getState().removeOwnedBey('owned-1');

    const { ownedBeys } = useProfileStore.getState().profile!;
    expect(ownedBeys).toHaveLength(1);
    expect(ownedBeys[0].id).toBe('owned-2');
  });

  it('syncs profile updates into the remembered localStorage copy', () => {
    localStorage.setItem(
      'bx-remembered-profile',
      JSON.stringify({ profile: testProfile(), payloadHash: 'hash-abc' })
    );
    useProfileStore.setState({ profile: testProfile(), status: 'unlocked', remembered: true });

    const created = useProfileStore.getState().addOwnedBey({ beyId: 'bey-b', priceEur: 9.99 });

    const remembered = JSON.parse(localStorage.getItem('bx-remembered-profile')!) as {
      profile: PersonalProfile;
      payloadHash: string;
    };
    expect(remembered.payloadHash).toBe('hash-abc');
    expect(remembered.profile.ownedBeys).toHaveLength(3);
    expect(remembered.profile.ownedBeys[2]).toMatchObject({
      id: created!.id,
      beyId: 'bey-b',
      priceEur: 9.99,
    });
  });

  it('leaves the remembered copy untouched when not remembered', () => {
    localStorage.setItem(
      'bx-remembered-profile',
      JSON.stringify({ profile: testProfile(), payloadHash: 'hash-abc' })
    );

    useProfileStore.getState().addOwnedBey({ beyId: 'bey-b' });

    const remembered = JSON.parse(localStorage.getItem('bx-remembered-profile')!) as {
      profile: PersonalProfile;
    };
    expect(remembered.profile.ownedBeys).toHaveLength(2);
  });
});

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
