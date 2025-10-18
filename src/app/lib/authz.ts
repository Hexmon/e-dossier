// src/app/lib/authz.ts
import { hasPermission } from '../db/queries/authz';
import { NextRequest } from 'next/server';
import { ApiError } from '@/app/lib/http';

export async function requirePerm(userId: string | undefined, perm: string) {
  if (!userId) return false;
  return hasPermission(userId, perm);
}

export function requireAuth(req: NextRequest) {
  const uid = req.headers.get('x-user-id');
  if (!uid) throw new ApiError(401, 'Unauthorized'); 
  const rolesHeader = req.headers.get('x-user-roles') ?? '';
  const roles = rolesHeader
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  return { userId: uid, roles };
}

export function hasAdminRole(roles: string[]) {
  // accept case variants: 'ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'
  const s = new Set(roles.map(r => r.toLowerCase()));
  return s.has('admin') || s.has('super_admin');
}

export function requireAdmin(req: NextRequest) {
  const { userId, roles } = requireAuth(req);
  if (!hasAdminRole(roles)) {
    throw new ApiError(403, 'Admin privileges required');
  }
  return { userId, roles };
}
