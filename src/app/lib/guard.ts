import { NextRequest } from 'next/server';
import { ApiError } from '@/app/lib/http';
import { requireAuth as internalRequireAuth } from '@/app/lib/authz';

export type Principal = {
  userId: string;
  roles: string[];
  apt?: unknown;   // your AptClaim
  pwd_at?: string | null;
};

/**
 * Pulls 'access_token' from cookies and verifies the JWT.
 * Throws ApiError(401/403) on failure.
 */
export async function requireAuth(req: NextRequest): Promise<Principal> {
  const ctx = await internalRequireAuth(req);
  if (!ctx.userId) throw new ApiError(401, 'Invalid token (no subject)');
  return {
    userId: ctx.userId,
    roles: ctx.roles,
    apt: ctx.claims?.apt,
    pwd_at: (ctx.claims as any)?.pwd_at ?? null,
  };
}

/**
 * Optional helper to require a permission (string key) in the principal.
 * (If you materialize perms into the JWT later, check them here.)
 */
export function requireRole(principal: Principal, allowed: string[] | Set<string>) {
  const roster = new Set(principal.roles);
  const ok = Array.isArray(allowed)
    ? allowed.some((r) => roster.has(r))
    : [...allowed].some((r) => roster.has(r));
  if (!ok) throw new ApiError(403, 'Forbidden (missing role)');
}
