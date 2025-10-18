import { NextRequest } from 'next/server';
import { verifyAccessJWT } from '@/app/lib/jwt';
import { ApiError } from '@/app/lib/http';

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
  const token = req.cookies.get('access_token')?.value;
  if (!token) throw new ApiError(401, 'Missing access token');

  try {
    const payload = await verifyAccessJWT(token);
    const sub = payload.sub as string | undefined;
    if (!sub) throw new ApiError(401, 'Invalid token (no subject)');
    const roles = (payload.roles as string[] | undefined) ?? [];

    return { userId: sub, roles, apt: payload.apt, pwd_at: (payload as any).pwd_at ?? null };
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }
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
