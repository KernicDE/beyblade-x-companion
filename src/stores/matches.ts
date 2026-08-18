import { create } from 'zustand';
import type { Match } from '../types';
import * as api from '../api/client';

type MatchInput = Omit<Match, 'id' | 'countsInStats'>;

interface MatchesState {
  matches: Match[];
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  add: (input: MatchInput) => Promise<void>;
  update: (id: string, input: Partial<MatchInput>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useMatchesStore = create<MatchesState>((set, get) => ({
  matches: [],
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.getMatches();
      set({ matches: data.matches, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load matches', loading: false });
    }
  },

  add: async (input) => {
    try {
      const { match } = await api.createMatch(input);
      set({ matches: [match, ...get().matches] });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to add match' });
      throw err;
    }
  },

  update: async (id, input) => {
    try {
      const { match } = await api.updateMatch(id, input);
      set({ matches: get().matches.map((m) => (m.id === id ? match : m)) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update match' });
      throw err;
    }
  },

  remove: async (id) => {
    try {
      await api.deleteMatch(id);
      set({ matches: get().matches.filter((m) => m.id !== id) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete match' });
      throw err;
    }
  },
}));
