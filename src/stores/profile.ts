import { create } from 'zustand';
import type { OwnedBey, PersonalProfile } from '../types';
import { decryptJson, isEncryptedPayload, type EncryptedPayload } from '../utils/crypto';

const REMEMBER_KEY = 'bx-remembered-profile';

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Migrate a decrypted profile to the current version (2):
 * - v1 `creations` becomes `builds`
 * - every OwnedBey without an id gets a generated one
 */
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

export type ProfileStatus = 'loading' | 'no-profile' | 'locked' | 'unlocking' | 'unlocked';

interface RememberedEntry {
  profile: PersonalProfile;
  /** Fingerprint of the encrypted payload the remembered profile came from. */
  payloadHash: string;
}

interface ProfileState {
  status: ProfileStatus;
  profile: PersonalProfile | null;
  remembered: boolean;
  /** Fetch profile.enc.json and restore a remembered session. Call once at app start. */
  init: () => Promise<void>;
  /** Unlock with password. Returns true on success. */
  unlock: (password: string, remember: boolean) => Promise<boolean>;
  /** Lock again (keeps the remembered copy if `remembered` is set). */
  lock: () => void;
  /** Forget the remembered plaintext on this device. */
  forgetDevice: () => void;
  /** Add a new owned bey copy. Assigns a fresh unique id. Returns the created entry. */
  addOwnedBey: (input: Omit<OwnedBey, 'id'>) => OwnedBey | null;
  /** Update a single owned bey copy by its exemplar id. */
  updateOwnedBey: (id: string, patch: Partial<Omit<OwnedBey, 'id'>>) => void;
  /** Remove a single owned bey copy by its exemplar id. */
  removeOwnedBey: (id: string) => void;
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

function payloadHash(payload: EncryptedPayload): string {
  return payload.data;
}

function readRemembered(): RememberedEntry | null {
  try {
    const stored = localStorage.getItem(REMEMBER_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<RememberedEntry>;
    const profile =
      typeof parsed.profile === 'object' && parsed.profile !== null
        ? migrateProfile(parsed.profile as unknown as Record<string, unknown>)
        : parsed.profile;
    if (!isPersonalProfile(profile) || typeof parsed.payloadHash !== 'string') {
      return null;
    }
    return { profile, payloadHash: parsed.payloadHash };
  } catch {
    return null;
  }
}

async function fetchEncryptedProfile(): Promise<unknown | null> {
  try {
    // Bypass the HTTP cache so a redeployed profile is picked up immediately.
    const response = await fetch(`${import.meta.env.BASE_URL}data/profile.enc.json`, {
      cache: 'no-cache',
    });
    if (!response.ok) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

export const useProfileStore = create<ProfileState>()((set, get) => {
  /** Replace the unlocked profile in memory and sync the remembered copy, if any. */
  const commitProfile = (profile: PersonalProfile) => {
    set({ profile });
    if (get().remembered) {
      try {
        const stored = localStorage.getItem(REMEMBER_KEY);
        const parsed = stored ? (JSON.parse(stored) as Record<string, unknown>) : {};
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ ...parsed, profile }));
      } catch {
        // Remembered copy is best-effort; ignore storage failures.
      }
    }
  };

  return {
  status: 'loading',
  profile: null,
  remembered: false,

  init: async () => {
    const remembered = readRemembered();
    const payload = await fetchEncryptedProfile();

    if (!isEncryptedPayload(payload)) {
      // No encrypted profile shipped — fall back to the remembered copy if any.
      set({
        status: remembered ? 'unlocked' : 'no-profile',
        profile: remembered?.profile ?? null,
        remembered: remembered !== null,
      });
      return;
    }

    if (remembered && remembered.payloadHash === payloadHash(payload)) {
      set({ status: 'unlocked', profile: remembered.profile, remembered: true });
      return;
    }

    // Shipped profile changed (or nothing remembered): drop the stale copy and
    // require a fresh unlock so the latest data is always shown.
    if (remembered) {
      localStorage.removeItem(REMEMBER_KEY);
    }
    set({ status: 'locked', profile: null, remembered: false });
  },

  unlock: async (password, remember) => {
    set({ status: 'unlocking' });
    const payload = await fetchEncryptedProfile();
    if (!isEncryptedPayload(payload)) {
      set({ status: 'no-profile', profile: null });
      return false;
    }
    try {
      const decrypted: unknown = await decryptJson(payload, password);
      const migrated =
        typeof decrypted === 'object' && decrypted !== null
          ? migrateProfile(decrypted as Record<string, unknown>)
          : decrypted;
      if (!isPersonalProfile(migrated)) {
        set({ status: 'locked', profile: null });
        return false;
      }
      if (remember) {
        const entry: RememberedEntry = { profile: migrated, payloadHash: payloadHash(payload) };
        localStorage.setItem(REMEMBER_KEY, JSON.stringify(entry));
      }
      set({ status: 'unlocked', profile: migrated, remembered: remember });
      return true;
    } catch {
      set({ status: 'locked', profile: null });
      return false;
    }
  },

  lock: () => {
    set({ status: 'locked', profile: null });
  },

  forgetDevice: () => {
    localStorage.removeItem(REMEMBER_KEY);
    const { status } = get();
    if (status === 'unlocked') {
      set({ status: 'locked', profile: null, remembered: false });
    } else {
      set({ remembered: false });
    }
  },

  addOwnedBey: (input) => {
    const { profile } = get();
    if (!profile) return null;
    const owned: OwnedBey = { ...input, id: generateId() };
    commitProfile({ ...profile, ownedBeys: [...profile.ownedBeys, owned] });
    return owned;
  },

  updateOwnedBey: (id, patch) => {
    const { profile } = get();
    if (!profile) return;
    commitProfile({
      ...profile,
      ownedBeys: profile.ownedBeys.map((owned) =>
        owned.id === id ? { ...owned, ...patch, id: owned.id } : owned
      ),
    });
  },

  removeOwnedBey: (id) => {
    const { profile } = get();
    if (!profile) return;
    commitProfile({
      ...profile,
      ownedBeys: profile.ownedBeys.filter((owned) => owned.id !== id),
    });
  },
  };
});
