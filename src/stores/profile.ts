import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Creation, Profile } from '../types';

const PROFILE_KEY = 'beyblade-x-profile';
const CURRENT_VERSION = 1;

interface ProfileState extends Profile {
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
    Array.isArray(profile.creations)
  );
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      version: CURRENT_VERSION,
      creations: [],

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
        set({
          version: profile.version,
          creations: profile.creations,
        });
      },
    }),
    {
      name: PROFILE_KEY,
      version: CURRENT_VERSION,
      migrate: (persistedState) => {
        if (isProfile(persistedState)) {
          return persistedState;
        }
        return { version: CURRENT_VERSION, creations: [] };
      },
    }
  )
);
