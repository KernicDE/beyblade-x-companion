import { create } from 'zustand';
import type { Match, OwnedBey, PersonalProfile } from '../types';

export function migrateProfile(value: Record<string, unknown>): Record<string, unknown> {
  const migrated = { ...value };
  if (migrated.version === 1) {
    migrated.builds = Array.isArray(migrated.builds)
      ? migrated.builds
      : Array.isArray(migrated.creations)
        ? migrated.creations
        : [];
    delete migrated.creations;
    const ownedBeys = Array.isArray(migrated.ownedBeys) ? (migrated.ownedBeys as OwnedBey[]) : [];
    migrated.ownedBeys = ownedBeys.map((owned) =>
      typeof owned.id === 'string' && owned.id.length > 0 ? owned : { ...owned, id: generateId() }
    );
    migrated.version = 2;
  }
  return migrated;
}

export function isPersonalProfile(value: unknown): value is PersonalProfile {
  if (typeof value !== 'object' || value === null) return false;
  const raw = value as Record<string, unknown>;
  return (
    raw.version === 2 &&
    Array.isArray(raw.ownedBeys) &&
    Array.isArray(raw.ownedParts) &&
    Array.isArray(raw.builds) &&
    Array.isArray(raw.matches)
  );
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export type ProfileStatus = 'unlocked';

interface ProfileState {
  status: ProfileStatus;
  profile: PersonalProfile;
  remembered: boolean;
  init: () => Promise<void>;
  unlock: (password: string, remember: boolean) => Promise<boolean>;
  lock: () => void;
  forgetDevice: () => void;
  addOwnedBey: (input: Omit<OwnedBey, 'id'>) => OwnedBey | null;
  updateOwnedBey: (id: string, patch: Partial<Omit<OwnedBey, 'id'>>) => void;
  removeOwnedBey: (id: string) => void;
  addMatch: (input: Omit<Match, 'id'>) => Match | null;
  updateMatch: (id: string, patch: Partial<Omit<Match, 'id'>>) => void;
  removeMatch: (id: string) => void;
}

export function emptyProfile(): PersonalProfile {
  return {
    version: 2,
    ownedBeys: [],
    ownedParts: [],
    builds: [],
    matches: [],
  };
}

export const useProfileStore = create<ProfileState>()((set, get) => {
  const commitProfile = (profile: PersonalProfile) => {
    set({ profile });
  };

  return {
    status: 'unlocked',
    profile: emptyProfile(),
    remembered: false,

    init: async () => {
      // Profile is now server-side; local store stays empty until pages are migrated.
      set({ status: 'unlocked', profile: emptyProfile(), remembered: false });
    },

    unlock: async () => {
      // Legacy unlock is no longer required.
      return true;
    },

    lock: () => {
      // No-op: server-side session is managed by the backend.
    },

    forgetDevice: () => {
      localStorage.removeItem('bx-remembered-profile');
    },

    addOwnedBey: (input) => {
      const { profile } = get();
      const owned: OwnedBey = { ...input, id: generateId() };
      commitProfile({ ...profile, ownedBeys: [...profile.ownedBeys, owned] });
      return owned;
    },

    updateOwnedBey: (id, patch) => {
      const { profile } = get();
      commitProfile({
        ...profile,
        ownedBeys: profile.ownedBeys.map((owned) =>
          owned.id === id ? { ...owned, ...patch, id: owned.id } : owned
        ),
      });
    },

    removeOwnedBey: (id) => {
      const { profile } = get();
      commitProfile({
        ...profile,
        ownedBeys: profile.ownedBeys.filter((owned) => owned.id !== id),
      });
    },

    addMatch: (input) => {
      const { profile } = get();
      const match: Match = { ...input, id: generateId() };
      commitProfile({ ...profile, matches: [...profile.matches, match] });
      return match;
    },

    updateMatch: (id, patch) => {
      const { profile } = get();
      commitProfile({
        ...profile,
        matches: profile.matches.map((match) =>
          match.id === id ? { ...match, ...patch } : match
        ),
      });
    },

    removeMatch: (id) => {
      const { profile } = get();
      commitProfile({
        ...profile,
        matches: profile.matches.filter((match) => match.id !== id),
      });
    },
  };
});
