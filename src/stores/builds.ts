import { create } from 'zustand';
import type { Build } from '../types';
import * as api from '../api/client';

interface BuildsState {
  builds: Build[];
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  add: (input: Omit<Build, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Build>;
  update: (id: string, input: Partial<Omit<Build, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useBuildsStore = create<BuildsState>((set, get) => ({
  builds: [],
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.getMyBuilds();
      set({ builds: data.builds, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load builds', loading: false });
    }
  },

  add: async (input) => {
    try {
      const { build } = await api.createBuild(input);
      set({ builds: [build, ...get().builds] });
      return build;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to save build' });
      throw err;
    }
  },

  update: async (id, input) => {
    try {
      const { build } = await api.updateBuild(id, input);
      set({ builds: get().builds.map((b) => (b.id === id ? build : b)) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update build' });
      throw err;
    }
  },

  remove: async (id) => {
    try {
      await api.deleteBuild(id);
      set({ builds: get().builds.filter((b) => b.id !== id) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete build' });
      throw err;
    }
  },
}));
