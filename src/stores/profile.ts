import { create } from 'zustand';
import type { PersonalProfile } from '../types';
import { decryptJson, isEncryptedPayload } from '../utils/crypto';

const REMEMBER_KEY = 'bx-remembered-profile';

export type ProfileStatus = 'loading' | 'no-profile' | 'locked' | 'unlocking' | 'unlocked';

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

function readRemembered(): PersonalProfile | null {
  try {
    const stored = localStorage.getItem(REMEMBER_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    return isPersonalProfile(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function fetchEncryptedProfile(): Promise<unknown | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/profile.enc.json`);
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
    const rememberedProfile = readRemembered();
    const payload = await fetchEncryptedProfile();

    if (payload === null) {
      // No encrypted profile shipped yet — nothing to unlock.
      set({ status: rememberedProfile ? 'unlocked' : 'no-profile', profile: rememberedProfile, remembered: rememberedProfile !== null });
      return;
    }

    if (!isEncryptedPayload(payload)) {
      set({ status: 'no-profile', profile: rememberedProfile, remembered: rememberedProfile !== null });
      return;
    }

    if (rememberedProfile) {
      set({ status: 'unlocked', profile: rememberedProfile, remembered: true });
      return;
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
        localStorage.setItem(REMEMBER_KEY, JSON.stringify(decrypted));
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
