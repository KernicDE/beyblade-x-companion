import { create } from 'zustand';
import type { PersonalProfile } from '../types';
import { decryptJson, isEncryptedPayload, type EncryptedPayload } from '../utils/crypto';

const REMEMBER_KEY = 'bx-remembered-profile';

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
}

export function isPersonalProfile(value: unknown): value is PersonalProfile {
  if (typeof value !== 'object' || value === null) return false;
  const raw = value as Record<string, unknown>;
  return (
    raw.version === 1 &&
    Array.isArray(raw.ownedBeys) &&
    Array.isArray(raw.ownedParts) &&
    Array.isArray(raw.creations) &&
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
    if (!isPersonalProfile(parsed.profile) || typeof parsed.payloadHash !== 'string') {
      return null;
    }
    return { profile: parsed.profile, payloadHash: parsed.payloadHash };
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

export const useProfileStore = create<ProfileState>()((set, get) => ({
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
      if (!isPersonalProfile(decrypted)) {
        set({ status: 'locked', profile: null });
        return false;
      }
      if (remember) {
        const entry: RememberedEntry = { profile: decrypted, payloadHash: payloadHash(payload) };
        localStorage.setItem(REMEMBER_KEY, JSON.stringify(entry));
      }
      set({ status: 'unlocked', profile: decrypted, remembered: remember });
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
}));
