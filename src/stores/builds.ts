import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Build } from '../types';

const BUILDS_KEY = 'bx-builds';
const LEGACY_CREATIONS_KEY = 'bx-creations';
const LEGACY_PROFILE_KEY = 'beyblade-x-profile';

/** One-time migration: builds stored under the old creations key. */
function readLegacyBuildsKey(): Build[] {
  try {
    const stored = localStorage.getItem(LEGACY_CREATIONS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as { state?: { creations?: Build[] } };
    const builds = parsed.state?.creations;
    return Array.isArray(builds) ? builds : [];
  } catch {
    return [];
  }
}

/** One-time migration: builds from the pre-tracker profile store (v3). */
function readLegacyProfileBuilds(): Build[] {
  try {
    const stored = localStorage.getItem(LEGACY_PROFILE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as { state?: { creations?: Build[] } };
    const builds = parsed.state?.creations;
    return Array.isArray(builds) ? builds : [];
  } catch {
    return [];
  }
}

interface BuildsState {
  builds: Build[];
  addBuild: (build: Omit<Build, 'id' | 'createdAt' | 'updatedAt'>) => Build;
  updateBuild: (id: string, updates: Partial<Build>) => void;
  deleteBuild: (id: string) => void;
  duplicateBuild: (id: string) => Build | null;
  replaceBuilds: (builds: Build[]) => void;
}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useBuildsStore = create<BuildsState>()(
  persist(
    (set, get) => ({
      builds: [],

      addBuild: (buildData) => {
        const now = new Date().toISOString();
        const build: Build = {
          ...buildData,
          id: createId(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ builds: [...state.builds, build] }));
        return build;
      },

      updateBuild: (id, updates) => {
        set((state) => ({
          builds: state.builds.map((build) =>
            build.id === id ? { ...build, ...updates, updatedAt: new Date().toISOString() } : build
          ),
        }));
      },

      deleteBuild: (id) => {
        set((state) => ({
          builds: state.builds.filter((build) => build.id !== id),
        }));
      },

      duplicateBuild: (id) => {
        const original = get().builds.find((b) => b.id === id);
        if (!original) return null;
        const now = new Date().toISOString();
        const copy: Build = {
          ...original,
          id: createId(),
          name: `${original.name} (Copy)`,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ builds: [...state.builds, copy] }));
        return copy;
      },

      replaceBuilds: (builds) => {
        set({ builds: Array.isArray(builds) ? builds : [] });
      },
    }),
    {
      name: BUILDS_KEY,
      merge: (persisted, current) => {
        const state = persisted as { builds?: Build[] } | undefined;
        if (state?.builds && state.builds.length > 0) {
          return { ...current, builds: state.builds };
        }
        const legacyKeyBuilds = readLegacyBuildsKey();
        if (legacyKeyBuilds.length > 0) {
          localStorage.removeItem(LEGACY_CREATIONS_KEY);
          return { ...current, builds: legacyKeyBuilds };
        }
        localStorage.removeItem(LEGACY_CREATIONS_KEY);
        const legacy = readLegacyProfileBuilds();
        return { ...current, builds: legacy };
      },
    }
  )
);
