import { create } from 'zustand';
import type { OwnedBey, OwnedPart } from '../types';
import * as api from '../api/client';

interface CollectionState {
  ownedBeys: OwnedBey[];
  ownedParts: OwnedPart[];
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  addBey: (input: Omit<OwnedBey, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBey: (id: string, input: Partial<Omit<OwnedBey, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  removeBey: (id: string) => Promise<void>;
  addPart: (input: Omit<OwnedPart, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updatePart: (id: string, input: Partial<Omit<OwnedPart, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  removePart: (id: string) => Promise<void>;
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  ownedBeys: [],
  ownedParts: [],
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.getCollection();
      set({ ownedBeys: data.ownedBeys, ownedParts: data.ownedParts, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load collection', loading: false });
    }
  },

  addBey: async (input) => {
    try {
      const { ownedBey } = await api.addOwnedBey(input);
      set({ ownedBeys: [ownedBey, ...get().ownedBeys] });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to add Bey' });
      throw err;
    }
  },

  updateBey: async (id, input) => {
    try {
      const { ownedBey } = await api.updateOwnedBey(id, input);
      set({ ownedBeys: get().ownedBeys.map((b) => (b.id === id ? ownedBey : b)) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update Bey' });
      throw err;
    }
  },

  removeBey: async (id) => {
    try {
      await api.deleteOwnedBey(id);
      set({ ownedBeys: get().ownedBeys.filter((b) => b.id !== id) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to remove Bey' });
      throw err;
    }
  },

  addPart: async (input) => {
    try {
      const { ownedPart } = await api.addOwnedPart(input);
      set({ ownedParts: [ownedPart, ...get().ownedParts] });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to add part' });
      throw err;
    }
  },

  updatePart: async (id, input) => {
    try {
      const { ownedPart } = await api.updateOwnedPart(id, input);
      set({ ownedParts: get().ownedParts.map((p) => (p.id === id ? ownedPart : p)) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update part' });
      throw err;
    }
  },

  removePart: async (id) => {
    try {
      await api.deleteOwnedPart(id);
      set({ ownedParts: get().ownedParts.filter((p) => p.id !== id) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to remove part' });
      throw err;
    }
  },
}));
