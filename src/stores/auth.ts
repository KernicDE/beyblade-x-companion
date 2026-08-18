import { create } from 'zustand';
import type { PublicUser } from '../types';
import * as api from '../api/client';

interface AuthState {
  user: PublicUser | null;
  loading: boolean;
  error: string | null;
  init: () => Promise<void>;
  login: (username: string, password: string, totpCode?: string) => Promise<void>;
  register: (username: string, password: string, email?: string | null) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  init: async () => {
    try {
      const { user } = await api.me();
      set({ user, loading: false, error: null });
    } catch {
      set({ user: null, loading: false, error: null });
    }
  },

  login: async (username, password, totpCode) => {
    set({ loading: true, error: null });
    try {
      const { user } = await api.login(username, password, totpCode);
      set({ user, loading: false, error: null });
    } catch (err) {
      set({ user: null, loading: false, error: err instanceof Error ? err.message : 'Login failed' });
      throw err;
    }
  },

  register: async (username, password, email) => {
    set({ loading: true, error: null });
    try {
      const { user } = await api.register(username, password, email);
      set({ user, loading: false, error: null });
    } catch (err) {
      set({ user: null, loading: false, error: err instanceof Error ? err.message : 'Registration failed' });
      throw err;
    }
  },

  logout: async () => {
    await api.logout();
    set({ user: null, error: null });
  },

  clearError: () => set({ error: null }),
}));
