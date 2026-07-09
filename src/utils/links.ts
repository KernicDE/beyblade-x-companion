import LZString from 'lz-string';
import type { Profile, Creation } from '../types';

export function compressProfile(profile: Profile): string {
  const json = JSON.stringify(profile);
  return LZString.compressToEncodedURIComponent(json);
}

export function decompressProfile(compressed: string): Profile | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    const parsed = JSON.parse(json) as unknown;
    if (!isProfile(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function compressCreation(creation: Creation): string {
  const json = JSON.stringify(creation);
  return LZString.compressToEncodedURIComponent(json);
}

export function decompressCreation(compressed: string): Creation | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    const parsed = JSON.parse(json) as unknown;
    if (!isCreation(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isProfile(value: unknown): value is Profile {
  if (typeof value !== 'object' || value === null) return false;
  const profile = value as Record<string, unknown>;
  return (
    typeof profile.version === 'number' &&
    Array.isArray(profile.creations) &&
    profile.creations.every(isCreation)
  );
}

function isCreation(value: unknown): value is Creation {
  if (typeof value !== 'object' || value === null) return false;
  const creation = value as Record<string, unknown>;
  return (
    typeof creation.id === 'string' &&
    typeof creation.name === 'string' &&
    typeof creation.bladeId === 'string' &&
    (creation.assistBladeId === undefined ||
      typeof creation.assistBladeId === 'string') &&
    typeof creation.ratchetId === 'string' &&
    typeof creation.bitId === 'string' &&
    typeof creation.createdAt === 'string' &&
    typeof creation.updatedAt === 'string'
  );
}
