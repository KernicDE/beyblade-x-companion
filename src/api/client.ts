import type {
  Bey,
  Part,
  Build,
  Match,
  OwnedBey,
  OwnedPart,
  Ratings,
  PublicUser,
  FinishType,
  Comment,
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

export async function login(username: string, password: string, totpCode?: string): Promise<AuthResponse> {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password, totpCode }),
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

interface BackendBuild {
  id: string;
  name: string;
  note: string | null;
  bladeId: string;
  assistBladeId: string | null;
  ratchetId: string;
  bitId: string;
  isPublic: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

function backendToBuild(b: BackendBuild): Build {
  return {
    id: b.id,
    name: b.name,
    note: b.note ?? undefined,
    bladeId: b.bladeId,
    assistBladeId: b.assistBladeId ?? undefined,
    ratchetId: b.ratchetId,
    bitId: b.bitId,
    isPublic: b.isPublic === 1,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

function buildToBackend(input: Partial<Omit<Build, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Partial<BackendBuild> {
  const out: Partial<BackendBuild> = {};
  if (input.name !== undefined) out.name = input.name;
  if (input.note !== undefined) out.note = input.note ?? null;
  if (input.bladeId !== undefined) out.bladeId = input.bladeId;
  if (input.assistBladeId !== undefined) out.assistBladeId = input.assistBladeId ?? null;
  if (input.ratchetId !== undefined) out.ratchetId = input.ratchetId;
  if (input.bitId !== undefined) out.bitId = input.bitId;
  if (input.isPublic !== undefined) out.isPublic = input.isPublic ? 1 : 0;
  return out;
}

export async function getBuilds(): Promise<{ builds: Build[] }> {
  const data = await request<{ builds: BackendBuild[] }>('/builds');
  return { builds: data.builds.map(backendToBuild) };
}

export async function getMyBuilds(): Promise<{ builds: Build[] }> {
  const data = await request<{ builds: BackendBuild[] }>('/builds/mine');
  return { builds: data.builds.map(backendToBuild) };
}

export async function createBuild(input: Omit<Build, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<{ build: Build }> {
  const data = await request<{ build: BackendBuild }>('/builds', {
    method: 'POST',
    body: JSON.stringify(buildToBackend(input)),
  });
  return { build: backendToBuild(data.build) };
}

export async function updateBuild(id: string, input: Partial<Omit<Build, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<{ build: Build }> {
  const data = await request<{ build: BackendBuild }>(`/builds/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(buildToBackend(input)),
  });
  return { build: backendToBuild(data.build) };
}

export async function deleteBuild(id: string): Promise<void> {
  await request(`/builds/${id}`, { method: 'DELETE' });
}

interface BackendMatch {
  id: string;
  date: string;
  myBeySource: 'bey' | 'ownedBey' | 'build';
  myBeyId: string;
  opponentName: string;
  opponentBeyId: string | null;
  opponentCombo: string | null;
  result: 'win' | 'loss';
  finishType: FinishType | null;
  note: string | null;
  countsInStats: number;
}

function backendToMatch(m: BackendMatch): Match {
  const myBey: Match['myBey'] =
    m.myBeySource === 'bey'
      ? { source: 'bey', beyId: m.myBeyId }
      : m.myBeySource === 'ownedBey'
        ? { source: 'ownedBey', ownedBeyId: m.myBeyId }
        : { source: 'creation', creationId: m.myBeyId };
  const opponent: Match['opponent'] = {
    name: m.opponentName,
    ...(m.opponentBeyId ? { beyId: m.opponentBeyId } : {}),
    ...(m.opponentCombo ? { combo: JSON.parse(m.opponentCombo) as Match['opponent']['combo'] } : {}),
  };
  return {
    id: m.id,
    date: m.date,
    myBey,
    opponent,
    result: m.result,
    finishType: m.finishType ?? undefined,
    note: m.note ?? undefined,
    countsInStats: m.countsInStats,
  };
}

function matchToBackend(input: Partial<Match>): Partial<BackendMatch> {
  const out: Partial<BackendMatch> = {
    date: input.date,
    result: input.result,
    finishType: input.finishType ?? null,
    note: input.note ?? null,
  };
  if (input.myBey) {
    out.myBeySource = input.myBey.source === 'creation' ? 'build' : input.myBey.source;
    out.myBeyId =
      input.myBey.source === 'bey'
        ? input.myBey.beyId
        : input.myBey.source === 'ownedBey'
          ? input.myBey.ownedBeyId
          : input.myBey.creationId;
  }
  if (input.opponent) {
    out.opponentName = input.opponent.name;
    out.opponentBeyId = input.opponent.beyId ?? null;
    out.opponentCombo = input.opponent.combo ? JSON.stringify(input.opponent.combo) : null;
  }
  return out;
}

export async function getMatches(): Promise<{ matches: Match[] }> {
  const data = await request<{ matches: BackendMatch[] }>('/matches');
  return { matches: data.matches.map(backendToMatch) };
}

export async function createMatch(input: Omit<Match, 'id' | 'countsInStats'>): Promise<{ match: Match }> {
  const data = await request<{ match: BackendMatch }>('/matches', {
    method: 'POST',
    body: JSON.stringify(matchToBackend(input)),
  });
  return { match: backendToMatch(data.match) };
}

export async function updateMatch(id: string, input: Partial<Omit<Match, 'id' | 'countsInStats'>>): Promise<{ match: Match }> {
  const data = await request<{ match: BackendMatch }>(`/matches/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(matchToBackend(input as Partial<Match>)),
  });
  return { match: backendToMatch(data.match) };
}

export async function deleteMatch(id: string): Promise<void> {
  await request(`/matches/${id}`, { method: 'DELETE' });
}

// Comments
export async function getBeyComments(id: string): Promise<{ comments: Comment[] }> {
  return request(`/beys/${id}/comments`);
}

export async function postBeyComment(id: string, text: string): Promise<{ comment: Comment; promotion?: { promoted: boolean; role?: string } }> {
  return request(`/beys/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function getPartComments(category: string, id: string): Promise<{ comments: Comment[] }> {
  return request(`/parts/${category}/${id}/comments`);
}

export async function postPartComment(category: string, id: string, text: string): Promise<{ comment: Comment; promotion?: { promoted: boolean; role?: string } }> {
  return request(`/parts/${category}/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function deleteComment(id: string): Promise<void> {
  await request(`/comments/${id}`, { method: 'DELETE' });
}

// Admin user management
export async function listUsers(): Promise<{ users: PublicUser[] }> {
  return request('/admin/users');
}

export async function setUserRole(id: string, role: PublicUser['role']): Promise<{ user: PublicUser }> {
  return request(`/admin/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function banUser(id: string, reason: string): Promise<{ user: PublicUser }> {
  return request(`/admin/users/${id}/ban`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function unbanUser(id: string): Promise<{ user: PublicUser }> {
  return request(`/admin/users/${id}/unban`, { method: 'POST' });
}

export async function promoteUser(id: string): Promise<{ user: PublicUser }> {
  return request(`/admin/users/${id}/promote`, { method: 'POST' });
}

// Catalog moderation
export interface PendingCatalogResponse {
  parts: Part[];
  beys: Bey[];
}

export async function getPendingCatalog(): Promise<PendingCatalogResponse> {
  return request('/admin/catalog/pending');
}

export async function suggestPart(input: Omit<Part, 'id' | 'status' | 'suggestedBy' | 'moderatorNote' | 'createdAt' | 'updatedAt'>): Promise<{ part: Part }> {
  return request('/admin/catalog/parts/suggest', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function suggestBey(input: Omit<Bey, 'id' | 'status' | 'suggestedBy' | 'moderatorNote' | 'createdAt' | 'updatedAt'>): Promise<{ bey: Bey }> {
  return request('/admin/catalog/beys/suggest', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updatePartStatus(
  category: string,
  id: string,
  status: 'approved' | 'rejected',
  moderatorNote?: string
): Promise<{ part: Part }> {
  return request(`/admin/catalog/parts/${category}/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, moderatorNote }),
  });
}

export async function updateBeyStatus(id: string, status: 'approved' | 'rejected', moderatorNote?: string): Promise<{ bey: Bey }> {
  return request(`/admin/catalog/beys/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, moderatorNote }),
  });
}

export async function editPart(category: string, id: string, input: Partial<Part>): Promise<{ part: Part }> {
  return request(`/admin/catalog/parts/${category}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function editBey(id: string, input: Partial<Bey>): Promise<{ bey: Bey }> {
  return request(`/admin/catalog/beys/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

// TOTP
export async function getTotpStatus(): Promise<{ enabled: boolean }> {
  return request('/auth/totp/status');
}

export async function setupTotp(): Promise<{ secret: string; uri: string; recoveryCodes: string[] }> {
  return request('/auth/totp/setup', { method: 'POST' });
}

export async function verifyTotpSetup(code: string): Promise<{ ok: boolean }> {
  return request('/auth/totp/verify', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function disableTotp(password: string): Promise<{ ok: boolean }> {
  return request('/auth/totp/disable', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}
