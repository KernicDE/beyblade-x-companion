import type { PublicUser, User } from '../types/index.js';

export function toPublicUser(user: User): PublicUser {
  const {
    passwordHash: _passwordHash,
    totpSecret: _totpSecret,
    totpRecoveryCodes: _totpRecoveryCodes,
    ...publicUser
  } = user;
  return publicUser;
}
