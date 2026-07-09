import { create } from 'zustand';
import type { ComboParts } from '../types';

interface ConfiguratorState extends ComboParts {
  setBlade: (id: string) => void;
  setAssistBlade: (id: string | undefined) => void;
  setRatchet: (id: string) => void;
  setBit: (id: string) => void;
  loadCombo: (combo: ComboParts) => void;
  reset: () => void;
}

const DEFAULT_COMBO: ComboParts = {
  bladeId: '',
  assistBladeId: undefined,
  ratchetId: '',
  bitId: '',
};

export const useConfiguratorStore = create<ConfiguratorState>()((set) => ({
  ...DEFAULT_COMBO,

  setBlade: (id) => set({ bladeId: id }),
  setAssistBlade: (id) => set({ assistBladeId: id }),
  setRatchet: (id) => set({ ratchetId: id }),
  setBit: (id) => set({ bitId: id }),
  loadCombo: (combo) => set({ ...combo }),
  reset: () => set({ ...DEFAULT_COMBO }),
}));
