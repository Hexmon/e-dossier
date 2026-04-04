// src/app/lib/authz.ts
import { NextRequest } from 'next/server';
import { ApiError } from '@/app/lib/http';
import { readAccessToken } from '@/app/lib/cookies';
import { verifyAccessJWT } from '@/app/lib/jwt';
import { db } from '@/app/db/client';
import { users } from '@/app/db/schema/auth/users';
import { eq } from 'drizzle-orm'; 
import { isProtectedAdminApiPath } from '@/app/lib/access-control-policy';
import { assertModuleApiAccessByPath } from '@/app/lib/module-access';
import { deriveSidebarRoleGroup } from '@/lib/sidebar-visibility';

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
    const payload = await verifyAccessJWT(token);
    const authContext = {
      userId: String(payload.sub),
      roles: (payload.roles ?? []) as string[],
      claims: payload,
    };

    const pathname = new URL(req.url).pathname;
    if (isProtectedAdminApiPath(pathname, req.method) && !hasAdminRole(authContext.roles)) {
      throw new ApiError(403, 'Admin privileges required', 'forbidden');
    }

    const position =
      typeof (payload as any)?.apt?.position === 'string' ? String((payload as any).apt.position) : null;
    await assertModuleApiAccessByPath(pathname, {
      userId: authContext.userId,
      roles: authContext.roles,
      position,
    });

    return authContext;
  } catch (e) {
    if (e instanceof ApiError) {
      throw e;
    }
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

export async function requireSuperAdmin(req: NextRequest) {
  const adminCtx = await requireAdmin(req);
  const roleGroup = deriveSidebarRoleGroup({
    roles: adminCtx.roles,
    position: adminCtx.claims?.apt?.position ?? null,
  });

  if (roleGroup !== 'SUPER_ADMIN') {
    throw new ApiError(403, 'Super admin privileges required', 'forbidden');
  }

  return adminCtx;
}
