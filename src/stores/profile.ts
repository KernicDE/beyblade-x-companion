import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Creation, Profile } from '../types';

const PROFILE_KEY = 'beyblade-x-profile';
const CURRENT_VERSION = 3;

interface ProfileState extends Profile {
  setUsername: (username: string) => void;
  setCurrency: (currency: Profile['currency']) => void;
  setAutoOwnParts: (value: boolean) => void;
  toggleOwnedBey: (beyId: string) => void;
  toggleOwnedProduct: (productId: string, partIds?: string[]) => void;
  toggleOwnedPart: (partId: string) => void;
  isOwnedBey: (beyId: string) => boolean;
  isOwnedProduct: (productId: string) => boolean;
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
  const raw = value as unknown as Record<string, unknown>;
  return (
    typeof raw.version === 'number' &&
    Array.isArray(raw.creations) &&
    Array.isArray(raw.ownedBeyIds ?? []) &&
    Array.isArray(raw.ownedProductIds ?? []) &&
    Array.isArray(raw.ownedPartIds ?? [])
  );
}

function migrateProfile(value: unknown): Profile {
  if (isProfile(value)) {
    const raw = value as unknown as Record<string, unknown>;
    return {
      version: CURRENT_VERSION,
      username: typeof raw.username === 'string' ? raw.username : undefined,
      ownedBeyIds: Array.isArray(raw.ownedBeyIds) ? (raw.ownedBeyIds as string[]) : [],
      ownedProductIds: Array.isArray(raw.ownedProductIds) ? (raw.ownedProductIds as string[]) : [],
      ownedPartIds: Array.isArray(raw.ownedPartIds) ? (raw.ownedPartIds as string[]) : [],
      currency: (raw.currency as Profile['currency']) ?? 'EUR',
      autoOwnParts: typeof raw.autoOwnParts === 'boolean' ? raw.autoOwnParts : true,
      creations: Array.isArray(raw.creations) ? (raw.creations as Creation[]) : [],
    };
  }
  return {
    version: CURRENT_VERSION,
    ownedBeyIds: [],
    ownedProductIds: [],
    ownedPartIds: [],
    currency: 'EUR',
    autoOwnParts: true,
    creations: [],
  };
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      version: CURRENT_VERSION,
      username: undefined,
      ownedBeyIds: [],
      ownedProductIds: [],
      ownedPartIds: [],
      currency: 'EUR',
      autoOwnParts: true,
      creations: [],

      setUsername: (username) => {
        set({ username: username.trim() || undefined });
      },

      setCurrency: (currency) => {
        set({ currency });
      },

      setAutoOwnParts: (value) => {
        set({ autoOwnParts: value });
      },

      toggleOwnedBey: (beyId) => {
        set((state) => ({
          ownedBeyIds: state.ownedBeyIds.includes(beyId)
            ? state.ownedBeyIds.filter((id) => id !== beyId)
            : [...state.ownedBeyIds, beyId],
        }));
      },

      toggleOwnedProduct: (productId, partIds) => {
        set((state) => {
          const alreadyOwned = state.ownedProductIds.includes(productId);
          const nextProductIds = alreadyOwned
            ? state.ownedProductIds.filter((id) => id !== productId)
            : [...state.ownedProductIds, productId];

          let nextPartIds = state.ownedPartIds;
          if (state.autoOwnParts && partIds) {
            const partSet = new Set(nextPartIds);
            if (alreadyOwned) {
              partIds.forEach((id) => partSet.delete(id));
            } else {
              partIds.forEach((id) => partSet.add(id));
            }
            nextPartIds = Array.from(partSet);
          }

          return {
            ownedProductIds: nextProductIds,
            ownedPartIds: nextPartIds,
          };
        });
      },

      toggleOwnedPart: (partId) => {
        set((state) => ({
          ownedPartIds: state.ownedPartIds.includes(partId)
            ? state.ownedPartIds.filter((id) => id !== partId)
            : [...state.ownedPartIds, partId],
        }));
      },

      isOwnedBey: (beyId) => get().ownedBeyIds.includes(beyId),
      isOwnedProduct: (productId) => get().ownedProductIds.includes(productId),
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
)
