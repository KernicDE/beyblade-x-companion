import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Build } from '../types';

const legacyBuild: Build = {
  id: 'build-1',
  name: 'Legacy Combo',
  bladeId: 'blade-a',
  ratchetId: 'ratchet-a',
  bitId: 'bit-a',
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-01T00:00:00.000Z',
};

async function importFreshStore() {
  vi.resetModules();
  return await import('./builds');
}

describe('builds store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('migrates builds from the legacy bx-creations key and removes it', async () => {
    localStorage.setItem('bx-creations', JSON.stringify({ state: { creations: [legacyBuild] } }));
    const { useBuildsStore } = await importFreshStore();

    expect(useBuildsStore.getState().builds).toEqual([legacyBuild]);
    expect(localStorage.getItem('bx-creations')).toBeNull();
  });

  it('adds, updates, duplicates and deletes builds', async () => {
    const { useBuildsStore } = await importFreshStore();
    const store = useBuildsStore.getState();

    const build = store.addBuild({
      name: 'My Build',
      bladeId: 'blade-a',
      ratchetId: 'ratchet-a',
      bitId: 'bit-a',
    });
    expect(useBuildsStore.getState().builds).toHaveLength(1);

    useBuildsStore.getState().updateBuild(build.id, { name: 'Renamed' });
    expect(useBuildsStore.getState().builds[0].name).toBe('Renamed');

    const copy = useBuildsStore.getState().duplicateBuild(build.id);
    expect(copy?.name).toBe('Renamed (Copy)');
    expect(useBuildsStore.getState().builds).toHaveLength(2);

    useBuildsStore.getState().deleteBuild(build.id);
    expect(useBuildsStore.getState().builds.map((b) => b.id)).toEqual([copy?.id]);
  });
});
