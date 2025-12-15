// src/app/api/v1/auth/logout/route.ts
import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { clearAuthCookies } from '@/app/lib/cookies';
import { requireAuth } from '@/app/lib/authz';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

function originMatches(req: NextRequest) {
  const expected = req.nextUrl.origin;
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');

  let refererOrigin: string | null = null;
  if (referer) {
    try {
      refererOrigin = new URL(referer).origin;
    } catch {
      refererOrigin = null;
    }
  }

  return (
    (origin && origin === expected) ||
    (!origin && refererOrigin && refererOrigin === expected)
  );
}

/**
 * POST /api/v1/auth/logout
 * - Same-origin check (CSRF protection without requiring tokens)
 * - Clears httpOnly access cookie
 * - Sends strict no-cache headers
 * - Uses Clear-Site-Data to wipe cookies & storage for this origin
 * - Returns 204 No Content
 * 
 * SECURITY NOTE: Kept in PUBLIC_ANY to allow logout even with expired CSRF tokens.
 * Same-origin check provides adequate CSRF protection for logout operations.
 */
async function POSTHandler(req: NextRequest) {
  try {
    // SECURITY FIX: Enhanced same-origin validation
    if (!originMatches(req)) {
      return json.forbidden('Cross-site request not allowed for logout.');
    }

    // Additional security: Check for suspicious headers that might indicate CSRF
    const contentType = req.headers.get('content-type');
    if (contentType && !contentType.includes('application/json') && !contentType.includes('application/x-www-form-urlencoded')) {
      return json.badRequest('Invalid content type for logout request.');
    }

    let actorUserId: string | null = null;
    try {
      const ctx = await requireAuth(req);
      actorUserId = ctx.userId;
    } catch {
      actorUserId = null;
    }

    // Prepare a 204 response with security headers
    const res = json.noContent({
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        // SECURITY FIX: Enhanced Clear-Site-Data directive
        'Clear-Site-Data': '"cookies","storage","cache"',
        // Additional security headers
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      },
    });

    // Server-authoritative cookie clear
    clearAuthCookies(res);

    await createAuditLog({
      actorUserId,
      eventType: AuditEventType.LOGOUT,
      resourceType: AuditResourceType.USER,
      resourceId: actorUserId,
      description: 'User logged out via /api/v1/auth/logout',
      metadata: { actorPresent: Boolean(actorUserId) },
      request: req,
    });

    return res;
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * OPTIONS preflight — no CORS advertised; keeps caches off.
 * SECURITY FIX: Enhanced OPTIONS handling
 */
async function OPTIONSHandler(req: NextRequest) {
  try {
    // Same-origin check for OPTIONS as well
    if (!originMatches(req)) {
      return json.forbidden('Cross-site OPTIONS not allowed.');
    }

    return json.noContent({
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    // Keep envelope consistent even on unexpected failures
    return json.serverError('Unexpected error handling OPTIONS');
  }
}
export const POST = withRouteLogging('POST', POSTHandler);

export const OPTIONS = withRouteLogging('OPTIONS', OPTIONSHandler);
