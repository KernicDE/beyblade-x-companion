import type {
  Bey,
  Part,
  Build,
  Match,
  OwnedBey,
  OwnedPart,
  Ratings,
  PublicUser,
} from '../types';

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export interface AuthResponse {
  user: PublicUser;
}

export async function register(username: string, password: string, email?: string | null): Promise<AuthResponse> {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, email }),
  });
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function logout(): Promise<void> {
  await request('/auth/logout', { method: 'POST' });
}

export async function me(): Promise<AuthResponse> {
  return request('/auth/me');
}

export interface CatalogResponse {
  parts: Part[];
  beys: Bey[];
}

export async function getCatalog(): Promise<CatalogResponse> {
  return request('/catalog');
}

export interface BeyDetailResponse {
  bey: Bey;
  ratings: Ratings & { count: number };
  userRating?: Ratings;
}

export async function getBey(id: string): Promise<BeyDetailResponse> {
  return request(`/beys/${id}`);
}

export interface PartDetailResponse {
  part: Part;
  ratings: Ratings & { count: number };
  userRating?: Ratings;
}

export async function getPart(category: string, id: string): Promise<PartDetailResponse> {
  return request(`/parts/${category}/${id}`);
}

export async function rateBey(id: string, ratings: Ratings): Promise<BeyDetailResponse> {
  return request(`/beys/${id}/ratings`, {
    method: 'POST',
    body: JSON.stringify(ratings),
  });
}

export async function ratePart(category: string, id: string, ratings: Ratings): Promise<PartDetailResponse> {
  return request(`/parts/${category}/${id}/ratings`, {
    method: 'POST',
    body: JSON.stringify(ratings),
  });
}

export interface ScanResponse {
  barcode: {
    id: string;
    code: string;
    bey?: Bey;
  };
}

export async function scanBarcode(code: string): Promise<ScanResponse> {
  return request('/scan/lookup', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export interface CollectionResponse {
  ownedBeys: OwnedBey[];
  ownedParts: OwnedPart[];
}

export async function getCollection(): Promise<CollectionResponse> {
  return request('/collection');
}

export async function addOwnedBey(input: Omit<OwnedBey, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<{ ownedBey: OwnedBey }> {
  return request('/collection/beys', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateOwnedBey(id: string, input: Partial<Omit<OwnedBey, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<{ ownedBey: OwnedBey }> {
  return request(`/collection/beys/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteOwnedBey(id: string): Promise<void> {
  await request(`/collection/beys/${id}`, { method: 'DELETE' });
}

export async function addOwnedPart(input: Omit<OwnedPart, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<{ ownedPart: OwnedPart }> {
  return request('/collection/parts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateOwnedPart(id: string, input: Partial<Omit<OwnedPart, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<{ ownedPart: OwnedPart }> {
  return request(`/collection/parts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteOwnedPart(id: string): Promise<void> {
  await request(`/collection/parts/${id}`, { method: 'DELETE' });
}

export async function getBuilds(): Promise<{ builds: Build[] }> {
  return request('/builds');
}

export async function getMyBuilds(): Promise<{ builds: Build[] }> {
  return request('/builds/mine');
}

export async function createBuild(input: Omit<Build, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<{ build: Build }> {
  return request('/builds', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateBuild(id: string, input: Partial<Omit<Build, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<{ build: Build }> {
  return request(`/builds/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteBuild(id: string): Promise<void> {
  await request(`/builds/${id}`, { method: 'DELETE' });
}

export async function getMatches(): Promise<{ matches: Match[] }> {
  return request('/matches');
}

export async function createMatch(input: Omit<Match, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'countsInStats'>): Promise<{ match: Match }> {
  return request('/matches', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateMatch(id: string, input: Partial<Omit<Match, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'countsInStats'>>): Promise<{ match: Match }> {
  return request(`/matches/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteMatch(id: string): Promise<void> {
  await request(`/matches/${id}`, { method: 'DELETE' });
}
