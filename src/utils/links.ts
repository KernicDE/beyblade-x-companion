import LZString from 'lz-string';
import type { Build, BuildsExport } from '../types';

export function compressProfile(profile: BuildsExport): string {
  const json = JSON.stringify(profile);
  return LZString.compressToEncodedURIComponent(json);
}

export function decompressProfile(compressed: string): BuildsExport | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    const parsed = JSON.parse(json) as unknown;
    return normalizeBuildsExport(parsed);
  } catch {
    return null;
  }
}

export function compressBuild(build: Build): string {
  const json = JSON.stringify(build);
  return LZString.compressToEncodedURIComponent(json);
}

export function decompressBuild(compressed: string): Build | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    const parsed = JSON.parse(json) as unknown;
    if (!isBuild(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Accepts both current (`builds`) and legacy (`creations`) export payloads. */
function normalizeBuildsExport(value: unknown): BuildsExport | null {
  if (typeof value !== 'object' || value === null) return null;
  const profile = value as Record<string, unknown>;
  if (typeof profile.version !== 'number') return null;
  if (profile.username !== undefined && typeof profile.username !== 'string') return null;

  if (Array.isArray(profile.builds) && profile.builds.every(isBuild)) {
    return { version: profile.version, username: profile.username as string | undefined, builds: profile.builds };
  }
  if (Array.isArray(profile.creations) && profile.creations.every(isBuild)) {
    return {
      version: profile.version,
      username: profile.username as string | undefined,
      builds: profile.creations,
    };
  }
  return null;
}

function isBuild(value: unknown): value is Build {
  if (typeof value !== 'object' || value === null) return false;
  const build = value as Record<string, unknown>;
  return (
    typeof build.id === 'string' &&
    typeof build.name === 'string' &&
    typeof build.bladeId === 'string' &&
    (build.assistBladeId === undefined || typeof build.assistBladeId === 'string') &&
    typeof build.ratchetId === 'string' &&
    typeof build.bitId === 'string' &&
    typeof build.createdAt === 'string' &&
    typeof build.updatedAt === 'string'
  );
}
