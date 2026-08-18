import type { Role } from '../types/index.js';

const roleRank: Record<Role, number> = {
  Council: 4,
  Referee: 3,
  Blader: 2,
  'Rookie Blader': 1,
};

export function hasRole(userRole: Role, required: Role): boolean {
  return roleRank[userRole] >= roleRank[required];
}

export function isAtLeast(userRole: Role, minimum: Role): boolean {
  return roleRank[userRole] >= roleRank[minimum];
}
