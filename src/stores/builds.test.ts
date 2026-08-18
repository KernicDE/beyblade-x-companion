import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Build } from '../types';

const sampleBuild: Build = {
  id: 'build-1',
  name: 'Test Build',
  bladeId: 'blade-a',
  ratchetId: 'ratchet-a',
  bitId: 'bit-a',
  isPublic: false,
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-01T00:00:00.000Z',
};

const api = {
  getMyBuilds: vi.fn(),
  createBuild: vi.fn(),
  updateBuild: vi.fn(),
  deleteBuild: vi.fn(),
};

vi.mock('../api/client', () => api);

async function importFreshStore() {
  vi.resetModules();
  return await import('./builds');
}

describe('builds store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches builds from the backend', async () => {
    api.getMyBuilds.mockResolvedValueOnce({ builds: [sampleBuild] });
    const { useBuildsStore } = await importFreshStore();
    const store = useBuildsStore.getState();

    await store.fetch();

    expect(useBuildsStore.getState().builds).toEqual([sampleBuild]);
  });

  it('adds a build and returns it', async () => {
    const input = {
      name: 'New Build',
      bladeId: 'blade-a',
      ratchetId: 'ratchet-a',
      bitId: 'bit-a',
    };
    const created = { ...sampleBuild, ...input };
    api.createBuild.mockResolvedValueOnce({ build: created });
    const { useBuildsStore } = await importFreshStore();

    const result = await useBuildsStore.getState().add(input);

    expect(result).toEqual(created);
    expect(useBuildsStore.getState().builds).toEqual([created]);
  });

  it('updates a build in place', async () => {
    api.getMyBuilds.mockResolvedValueOnce({ builds: [sampleBuild] });
    const updated = { ...sampleBuild, name: 'Renamed' };
    api.updateBuild.mockResolvedValueOnce({ build: updated });
    const { useBuildsStore } = await importFreshStore();

    await useBuildsStore.getState().fetch();
    await useBuildsStore.getState().update(sampleBuild.id, { name: 'Renamed' });

    expect(useBuildsStore.getState().builds[0].name).toBe('Renamed');
  });

  it('removes a build', async () => {
    api.getMyBuilds.mockResolvedValueOnce({ builds: [sampleBuild] });
    api.deleteBuild.mockResolvedValueOnce(undefined);
    const { useBuildsStore } = await importFreshStore();

    await useBuildsStore.getState().fetch();
    await useBuildsStore.getState().remove(sampleBuild.id);

    expect(useBuildsStore.getState().builds).toHaveLength(0);
  });
});
