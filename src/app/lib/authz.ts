// src/app/lib/authz.ts
import { NextRequest } from 'next/server';
import { ApiError } from '@/app/lib/http';
import { readAccessToken } from '@/app/lib/cookies';
import { verifyAccessJWT } from '@/app/lib/jwt';
import { db } from '@/app/db/client';
import { users } from '@/app/db/schema/auth/users';
import { eq } from 'drizzle-orm'; 
import { ensureRequestContext, noteRequestActor } from '@/lib/audit-log';

export function hasAdminRole(roles?: string[]) {
  return Array.isArray(roles) && roles.some(r =>
    r === 'ADMIN' || r === 'SUPER_ADMIN' || r === 'COMMANDANT' // adjust to your model
  );
}

async function ensureActiveUser(userId: string) {
  const [u] = await db
    .select({ isActive: users.isActive, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!u) throw new ApiError(401, 'Unauthorized', 'unauthorized');

  if (!u.isActive || u.deletedAt) {
    throw new ApiError(
      403,
      'Account is deactivated. Please contact administrator.',
      'user_inactive_or_deleted'
    );
  }
}

export async function requireAuth(req: NextRequest) {
  const token = readAccessToken(req);
  if (!token) throw new ApiError(401, 'Unauthorized', 'unauthorized');

  try {
    ensureRequestContext(req);
    const payload = await verifyAccessJWT(token);
    const res = {
      userId: String(payload.sub),
      roles: (payload.roles ?? []) as string[],
      claims: payload,
    };
    noteRequestActor(req, res.userId, res.roles);
    return res;
  } catch (e) {
    // signature/exp/nbf/iss/aud failure
    throw new ApiError(401, 'Unauthorized', 'invalid_token');
  }
}

const ADMIN_POSITIONS = new Set(['ADMIN', 'SUPER_ADMIN']);

export async function requireAdmin(req: NextRequest) {
  const { userId, roles, claims } = await requireAuth(req);

  // Derive effective roles from appointment position (optional but handy)
  const effective = new Set(roles);
  const pos = claims.apt?.position;
  if (pos && ADMIN_POSITIONS.has(pos)) effective.add('ADMIN');

  const effectiveRoles = Array.from(effective);
  if (!hasAdminRole(effectiveRoles)) {
    throw new ApiError(403, 'Admin privileges required', 'forbidden');
  }

  // Return enriched context for downstream handlers if needed
  return { userId, roles: effectiveRoles, claims };
}
