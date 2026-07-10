import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Creation, Profile } from '../types';

const PROFILE_KEY = 'beyblade-x-profile';
const CURRENT_VERSION = 2;

interface ProfileState extends Profile {
  setUsername: (username: string) => void;
  toggleOwnedBey: (beyId: string) => void;
  toggleOwnedPart: (partId: string) => void;
  isOwnedBey: (beyId: string) => boolean;
  isOwnedPart: (partId: string) => boolean;
  addCreation: (creation: Omit<Creation, 'id' | 'createdAt' | 'updatedAt'>) => Creation;
  updateCreation: (id: string, updates: Partial<Creation>) => void;
  deleteCreation: (id: string) => void;
  duplicateCreation: (id: string) => Creation | null;
  replaceProfile: (profile: Profile) => void;
}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isProfile(value: unknown): value is Profile {
  if (typeof value !== 'object' || value === null) return false;
  const profile = value as Record<string, unknown>;
  return (
    typeof profile.version === 'number' &&
    Array.isArray(profile.creations) &&
    Array.isArray(profile.ownedBeyIds ?? []) &&
    Array.isArray(profile.ownedPartIds ?? [])
  );
}

function migrateProfile(value: unknown): Profile {
  if (isProfile(value)) {
    const raw = value as unknown as Record<string, unknown>;
    return {
      version: CURRENT_VERSION,
      username: typeof raw.username === 'string' ? raw.username : undefined,
      ownedBeyIds: Array.isArray(raw.ownedBeyIds) ? raw.ownedBeyIds as string[] : [],
      ownedPartIds: Array.isArray(raw.ownedPartIds) ? raw.ownedPartIds as string[] : [],
      creations: Array.isArray(raw.creations) ? raw.creations as Creation[] : [],
    };
  }
  return { version: CURRENT_VERSION, ownedBeyIds: [], ownedPartIds: [], creations: [] };
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      version: CURRENT_VERSION,
      username: undefined,
      ownedBeyIds: [],
      ownedPartIds: [],
      creations: [],

      setUsername: (username) => {
        set({ username: username.trim() || undefined });
      },

      toggleOwnedBey: (beyId) => {
        set((state) => ({
          ownedBeyIds: state.ownedBeyIds.includes(beyId)
            ? state.ownedBeyIds.filter((id) => id !== beyId)
            : [...state.ownedBeyIds, beyId],
        }));
      },

      toggleOwnedPart: (partId) => {
        set((state) => ({
          ownedPartIds: state.ownedPartIds.includes(partId)
            ? state.ownedPartIds.filter((id) => id !== partId)
            : [...state.ownedPartIds, partId],
        }));
      },

      isOwnedBey: (beyId) => get().ownedBeyIds.includes(beyId),
      isOwnedPart: (partId) => get().ownedPartIds.includes(partId),

      addCreation: (creationData) => {
        const now = new Date().toISOString();
        const creation: Creation = {
          ...creationData,
          id: createId(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          creations: [...state.creations, creation],
        }));
        return creation;
      },

      updateCreation: (id, updates) => {
        set((state) => ({
          creations: state.creations.map((creation) =>
            creation.id === id
              ? { ...creation, ...updates, updatedAt: new Date().toISOString() }
              : creation
          ),
        }));
      },

      deleteCreation: (id) => {
        set((state) => ({
          creations: state.creations.filter((creation) => creation.id !== id),
        }));
      },

      duplicateCreation: (id) => {
        const original = get().creations.find((c) => c.id === id);
        if (!original) return null;
        const now = new Date().toISOString();
        const copy: Creation = {
          ...original,
          id: createId(),
          name: `${original.name} (Copy)`,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          creations: [...state.creations, copy],
        }));
        return copy;
      },

      replaceProfile: (profile) => {
        set(migrateProfile(profile));
      },
    }),
    {
      name: PROFILE_KEY,
      version: CURRENT_VERSION,
      migrate: (persistedState) => {
        return migrateProfile(persistedState);
      },
    }
  )
);
