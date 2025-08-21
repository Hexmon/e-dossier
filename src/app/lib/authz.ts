// src/app/lib/authz.ts
import { hasPermission } from '../db/queries/authz';
export async function requirePerm(userId: string | undefined, perm: string) {
  if (!userId) return false;
  return hasPermission(userId, perm);
}
