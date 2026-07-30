import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Creation } from '../types';

const CREATIONS_KEY = 'bx-creations';
const LEGACY_PROFILE_KEY = 'beyblade-x-profile';

/** One-time migration: creations from the pre-tracker profile store (v3). */
function readLegacyCreations(): Creation[] {
  try {
    const stored = localStorage.getItem(LEGACY_PROFILE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as { state?: { creations?: Creation[] } };
    const creations = parsed.state?.creations;
    return Array.isArray(creations) ? creations : [];
  } catch {
    return [];
  }
}

interface CreationsState {
  creations: Creation[];
  addCreation: (creation: Omit<Creation, 'id' | 'createdAt' | 'updatedAt'>) => Creation;
  updateCreation: (id: string, updates: Partial<Creation>) => void;
  deleteCreation: (id: string) => void;
  duplicateCreation: (id: string) => Creation | null;
  replaceCreations: (creations: Creation[]) => void;
}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useCreationsStore = create<CreationsState>()(
  persist(
    (set, get) => ({
      creations: [],

      addCreation: (creationData) => {
        const now = new Date().toISOString();
        const creation: Creation = {
          ...creationData,
          id: createId(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ creations: [...state.creations, creation] }));
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
        set((state) => ({ creations: [...state.creations, copy] }));
        return copy;
      },

      replaceCreations: (creations) => {
        set({ creations: Array.isArray(creations) ? creations : [] });
      },
    }),
    {
      name: CREATIONS_KEY,
      merge: (persisted, current) => {
        const state = persisted as { creations?: Creation[] } | undefined;
        if (state?.creations && state.creations.length > 0) {
          return { ...current, creations: state.creations };
        }
        const legacy = readLegacyCreations();
        return { ...current, creations: legacy };
      },
    }
  )
);
