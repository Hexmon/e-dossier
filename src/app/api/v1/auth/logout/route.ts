// src/app/api/v1/auth/logout/route.ts
import { NextRequest } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { clearAuthCookies } from '@/app/lib/cookies';
import { requireAuth } from '@/app/lib/authz';
import { createAuditLog, AuditEventType, AuditResourceType } from '@/lib/audit-log';
import { withRouteLogging } from '@/lib/withRouteLogging';

function getExpectedOrigins(req: NextRequest) {
  const origins = new Set<string>([req.nextUrl.origin]);
  const forwardedHost = req.headers.get('x-forwarded-host');
  const host = forwardedHost ?? req.headers.get('host');
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const proto = (forwardedProto ?? req.nextUrl.protocol.replace(':', '')).split(',')[0]?.trim();

  if (host && proto) {
    origins.add(`${proto}://${host}`);
  }

  return origins;
}

function originMatches(req: NextRequest) {
  const expectedOrigins = getExpectedOrigins(req);
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const secFetchSite = req.headers.get('sec-fetch-site');

  const matchesExpected = (value: string) => {
    try {
      const url = new URL(value);
      if (expectedOrigins.has(url.origin)) return true;
      for (const allowed of expectedOrigins) {
        const allowedUrl = new URL(allowed);
        if (url.hostname === allowedUrl.hostname && url.protocol === allowedUrl.protocol) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  if (origin && origin !== 'null' && matchesExpected(origin)) return true;
  if (!origin && referer && matchesExpected(referer)) return true;

  if (secFetchSite === 'same-origin' || secFetchSite === 'same-site') return true;

  return false;
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
  const startTime = Date.now();
  console.time(`logout-${req.headers.get('x-request-id') || 'unknown'}`);

  try {
    // SECURITY FIX: Enhanced same-origin validation
    if (!originMatches(req)) {
      console.timeEnd(`logout-${req.headers.get('x-request-id') || 'unknown'}`);
      return json.forbidden('Cross-site request not allowed for logout.');
    }

    // Additional security: Check for suspicious headers that might indicate CSRF
    const contentType = req.headers.get('content-type');
    if (contentType && !contentType.includes('application/json') && !contentType.includes('application/x-www-form-urlencoded')) {
      console.timeEnd(`logout-${req.headers.get('x-request-id') || 'unknown'}`);
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

    // Non-blocking audit logging: defer to next tick to avoid blocking response
    setImmediate(() => {
      createAuditLog({
        actorUserId,
        eventType: AuditEventType.LOGOUT,
        resourceType: AuditResourceType.USER,
        resourceId: actorUserId,
        description: 'User logged out via /api/v1/auth/logout',
        metadata: { actorPresent: Boolean(actorUserId) },
        request: req,
      }).catch((err) => {
        console.error('Failed to log logout audit event:', err);
      });
    });

    const duration = Date.now() - startTime;
    console.log(`Logout response time: ${duration}ms`);
    console.timeEnd(`logout-${req.headers.get('x-request-id') || 'unknown'}`);

    return res;
  } catch (err) {
    const duration = Date.now() - startTime;
    console.log(`Logout error response time: ${duration}ms`);
    console.timeEnd(`logout-${req.headers.get('x-request-id') || 'unknown'}`);
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
