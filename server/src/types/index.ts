export type Role = 'Council' | 'Referee' | 'Blader' | 'Rookie Blader';

export interface User {
  id: string;
  username: string;
  email: string | null;
  passwordHash: string;
  role: Role;
  isBanned: number;
  banReason: string | null;
  bannedAt: string | null;
  bannedBy: string | null;
  totpSecret: string | null;
  totpEnabled: number;
  totpRecoveryCodes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PublicUser = Omit<User, 'passwordHash' | 'totpSecret' | 'totpRecoveryCodes'>;
