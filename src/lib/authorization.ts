// src/lib/authorization.ts
// SECURITY FIX: Authorization helpers to prevent IDOR vulnerabilities
import { NextRequest } from 'next/server';
import { requireAuth, hasAdminRole } from '@/app/lib/authz';
import { ApiError } from '@/app/lib/http';
import { db } from '@/app/db/client';
import { users } from '@/app/db/schema/auth/users';
import { appointments } from '@/app/db/schema/auth/appointments';
import { ocCadets } from '@/app/db/schema/training/oc';
import { eq, and, isNull } from 'drizzle-orm';
import { SCOPE } from '@/constants/app.constants';
import { setRequestTenant } from '@/lib/audit-log';

/**
 * Authorization context from JWT
 */
export type AuthContext = {
  userId: string;
  roles: string[];
  apt?: {
    id: string;
    position: string;
    scope: {
      type: string;
      id: string | null;
    };
  } | null;
};

type RawAuthContext = Awaited<ReturnType<typeof requireAuth>>;

function normalizeAuthContext(raw: RawAuthContext): AuthContext {
  const claims = (raw as any)?.claims ?? {};
  const apt = (claims as any)?.apt;

  return {
    userId: String(raw.userId ?? ''),
    roles: Array.isArray(raw.roles) ? raw.roles : [],
    apt: apt
      ? {
          id: String(apt.id ?? ''),
          position: String(apt.position ?? ''),
          scope: {
            type: String(apt.scope?.type ?? ''),
            id: apt.scope?.id == null ? null : String(apt.scope.id),
          },
        }
      : null,
  };
}

/**
 * Check if user is admin
 */
export function isAdmin(context: AuthContext): boolean {
  return hasAdminRole(context.roles);
}

/**
 * Check if user has specific position
 */
export function hasPosition(context: AuthContext, positionKey: string): boolean {
  return context.apt?.position === positionKey;
}

/**
 * Check if user has scope access
 */
export function hasScopeAccess(
  context: AuthContext,
  requiredScope: { type: string; id?: string | null }
): boolean {
  if (isAdmin(context)) return true;
  
  if (!context.apt) return false;
  
  const userScope = context.apt.scope;
  
  // GLOBAL scope has access to everything
  if (userScope.type === SCOPE.GLOBAL) return true;
  
  // WING scope has access to WING, SQUADRON, and PLATOON
  if (userScope.type === SCOPE.WING) {
    return [SCOPE.WING, SCOPE.SQUADRON, SCOPE.PLATOON].includes(requiredScope.type as any);
  }
  
  // SQUADRON scope has access to SQUADRON and PLATOON
  if (userScope.type === SCOPE.SQUADRON) {
    return [SCOPE.SQUADRON, SCOPE.PLATOON].includes(requiredScope.type as any);
  }
  
  // PLATOON scope only has access to specific PLATOON
  if (userScope.type === SCOPE.PLATOON && requiredScope.type === SCOPE.PLATOON) {
    return userScope.id === requiredScope.id;
  }
  
  return false;
}

/**
 * Authorize user access (self or admin)
 * @param req - Request object
 * @param targetUserId - User ID to access
 * @returns Auth context if authorized
 * @throws ApiError if not authorized
 */
export async function authorizeUserAccess(
  req: NextRequest,
  targetUserId: string
): Promise<AuthContext> {
  const context = normalizeAuthContext(await requireAuth(req));
  
  // Admin can access any user
  if (isAdmin(context)) {
    return context;
  }
  
  // User can access their own data
  if (context.userId === targetUserId) {
    return context;
  }
  
  throw new ApiError(403, 'Not authorized to access this user', 'forbidden');
}

/**
 * Authorize OC record access
 * @param req - Request object
 * @param ocId - OC record ID
 * @returns Auth context if authorized
 * @throws ApiError if not authorized
 */
export async function authorizeOcAccess(
  req: NextRequest,
  ocId: string
): Promise<AuthContext> {
  const context = normalizeAuthContext(await requireAuth(req));
  setRequestTenant(req, ocId);
  
  // Admin can access any OC record
  if (isAdmin(context)) {
    return context;
  }
  
  // Get OC record to check platoon
  const [oc] = await db
    .select({ platoonId: ocCadets.platoonId })
    .from(ocCadets)
    .where(eq(ocCadets.id, ocId))
    .limit(1);
  
  if (!oc) {
    throw new ApiError(404, 'OC record not found', 'not_found');
  }
  
  // Check if user has scope access to this OC's platoon
  if (oc.platoonId && hasScopeAccess(context, { type: SCOPE.PLATOON, id: oc.platoonId })) {
    return context;
  }
  
  // Check if user is platoon commander for this OC's platoon
  if (oc.platoonId && hasPosition(context, 'PLATOON_COMMANDER')) {
    if (context.apt?.scope.type === SCOPE.PLATOON && context.apt?.scope.id === oc.platoonId) {
      return context;
    }
  }
  
  throw new ApiError(403, 'Not authorized to access this OC record', 'forbidden');
}

/**
 * Authorize appointment access
 * @param req - Request object
 * @param appointmentId - Appointment ID
 * @returns Auth context if authorized
 * @throws ApiError if not authorized
 */
export async function authorizeAppointmentAccess(
  req: NextRequest,
  appointmentId: string
): Promise<AuthContext> {
  const context = normalizeAuthContext(await requireAuth(req));
  
  // Admin can access any appointment
  if (isAdmin(context)) {
    return context;
  }
  
  // Get appointment to check user
  const [appointment] = await db
    .select({ userId: appointments.userId, scopeType: appointments.scopeType, scopeId: appointments.scopeId })
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);
  
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found', 'not_found');
  }
  
  // User can access their own appointment
  if (context.userId === appointment.userId) {
    return context;
  }
  
  // Check if user has scope access to this appointment's scope
  if (hasScopeAccess(context, { type: appointment.scopeType, id: appointment.scopeId })) {
    return context;
  }
  
  throw new ApiError(403, 'Not authorized to access this appointment', 'forbidden');
}

/**
 * Authorize course access (any authenticated user can read)
 * @param req - Request object
 * @returns Auth context
 */
export async function authorizeCourseAccess(req: NextRequest): Promise<AuthContext> {
  // Any authenticated user can access courses
  return normalizeAuthContext(await requireAuth(req));
}

/**
 * Authorize course modification (admin only)
 * @param req - Request object
 * @returns Auth context if authorized
 * @throws ApiError if not authorized
 */
export async function authorizeCourseModification(req: NextRequest): Promise<AuthContext> {
  const context = normalizeAuthContext(await requireAuth(req));
  
  if (!isAdmin(context)) {
    throw new ApiError(403, 'Admin privileges required', 'forbidden');
  }
  
  return context;
}

/**
 * Authorize instructor access (any authenticated user can read)
 * @param req - Request object
 * @returns Auth context
 */
export async function authorizeInstructorAccess(req: NextRequest): Promise<AuthContext> {
  // Any authenticated user can access instructors
  return normalizeAuthContext(await requireAuth(req));
}

/**
 * Authorize instructor modification (admin only)
 * @param req - Request object
 * @returns Auth context if authorized
 * @throws ApiError if not authorized
 */
export async function authorizeInstructorModification(req: NextRequest): Promise<AuthContext> {
  const context = normalizeAuthContext(await requireAuth(req));
  
  if (!isAdmin(context)) {
    throw new ApiError(403, 'Admin privileges required', 'forbidden');
  }
  
  return context;
}

/**
 * Authorize subject access (any authenticated user can read)
 * @param req - Request object
 * @returns Auth context
 */
export async function authorizeSubjectAccess(req: NextRequest): Promise<AuthContext> {
  // Any authenticated user can access subjects
  return normalizeAuthContext(await requireAuth(req));
}

/**
 * Authorize subject modification (admin only)
 * @param req - Request object
 * @returns Auth context if authorized
 * @throws ApiError if not authorized
 */
export async function authorizeSubjectModification(req: NextRequest): Promise<AuthContext> {
  const context = normalizeAuthContext(await requireAuth(req));
  
  if (!isAdmin(context)) {
    throw new ApiError(403, 'Admin privileges required', 'forbidden');
  }
  
  return context;
}

/**
 * Require admin access
 * @param req - Request object
 * @returns Auth context if authorized
 * @throws ApiError if not authorized
 */
export async function requireAdminAccess(req: NextRequest): Promise<AuthContext> {
  const context = normalizeAuthContext(await requireAuth(req));
  
  if (!isAdmin(context)) {
    throw new ApiError(403, 'Admin privileges required', 'forbidden');
  }
  
  return context;
}

/**
 * Check if user can modify another user's data
 * @param context - Auth context
 * @param targetUserId - Target user ID
 * @returns True if authorized
 */
export function canModifyUser(context: AuthContext, targetUserId: string): boolean {
  // Admin can modify any user
  if (isAdmin(context)) return true;
  
  // User can modify their own data
  if (context.userId === targetUserId) return true;
  
  return false;
}

/**
 * Check if user can delete a resource
 * @param context - Auth context
 * @returns True if authorized
 */
export function canDelete(context: AuthContext): boolean {
  // Only admin can delete
  return isAdmin(context);
}
