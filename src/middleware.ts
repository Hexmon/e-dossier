// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { json } from '@/app/lib/http';
import {
  generateCsrfToken,
  setCsrfCookie,
  validateCsrfToken,
  requiresCsrfProtection
} from '@/lib/csrf';
import {
  getClientIp,
  checkApiRateLimit,
  getRateLimitHeaders
} from '@/lib/ratelimit';
// NOTE: Cannot import audit-log in middleware (Edge Runtime doesn't support database operations)
// Audit logging for middleware events should be done in API routes instead

const PROTECTED_PREFIX = '/api/v1/';

// Public for any method (rare)
const PUBLIC_ANY: string[] = [
  '/api/v1/auth/login',
  '/api/v1/auth/signup',
  '/api/v1/auth/logout',   // allow clearing cookies
  '/api/v1/admin/users/check-username',
  '/api/v1/health',
  '/api/v1/change-password'
];

// Public only for specific methods
const PUBLIC_BY_METHOD: Record<string, string[]> = {
  // Make ONLY GET public for appointments
  GET: [
    //  '/api/v1/roles',
    '/api/v1/admin/appointments',
    '/api/v1/admin/positions',
    '/api/v1/platoons'
  ],
  // If you ever want some POST public, add here:
  // POST: [ '/api/v1/some/public/post' ],
};

function matchPrefix(pathname: string, prefix: string) {
  // exact match OR prefix followed by '/...'
  return pathname === prefix || pathname.startsWith(prefix + '/');
}

function isPublic(pathname: string, method: string) {
  if (!pathname.startsWith(PROTECTED_PREFIX)) return true;

  // method-agnostic public
  if (PUBLIC_ANY.some((p) => matchPrefix(pathname, p))) return true;

  // method-specific public
  const allowForMethod = PUBLIC_BY_METHOD[method.toUpperCase()];
  if (allowForMethod?.some((p) => matchPrefix(pathname, p))) return true;

  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();

  // SECURITY FIX: Rate Limiting for API requests
  // Apply rate limiting to all API endpoints
  if (pathname.startsWith(PROTECTED_PREFIX)) {
    const clientIp = getClientIp(req);
    const rateLimitResult = await checkApiRateLimit(clientIp);

    // Add rate limit headers to response
    const headers = getRateLimitHeaders(rateLimitResult as any);

    if (!rateLimitResult.success) {
      // NOTE: Audit logging moved to API routes (Edge Runtime limitation)
      // Rate limit exceeded
      return new NextResponse(
        JSON.stringify({
          status: 429,
          ok: false,
          error: 'too_many_requests',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
            'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }
  }

  // SECURITY FIX: CSRF Protection for state-changing requests
  // Generate CSRF token for GET requests (safe methods)
  if (method === 'GET' && pathname.startsWith(PROTECTED_PREFIX)) {
    const response = NextResponse.next();
    const csrfToken = await generateCsrfToken();
    setCsrfCookie(response, csrfToken);
    return response;
  }

  // Validate CSRF token for state-changing requests (POST, PUT, PATCH, DELETE)
  if (requiresCsrfProtection(method) && pathname.startsWith(PROTECTED_PREFIX)) {
    // Skip CSRF validation for login/signup/logout:
    // - login/signup may not have a token yet
    // - logout relies on same-origin checks inside the route handler
    const skipCsrfPaths = [
      '/api/v1/auth/login',
      '/api/v1/auth/signup',
      '/api/v1/auth/logout',
    ];
    const shouldSkipCsrf = skipCsrfPaths.some((p) => matchPrefix(pathname, p));

    if (!shouldSkipCsrf && !(await validateCsrfToken(req))) {
      // NOTE: Audit logging moved to API routes (Edge Runtime limitation)
      return json.forbidden('Invalid or missing CSRF token');
    }
  }

  if (isPublic(pathname, method)) return NextResponse.next();

  // Light gate: token required for protected routes
  const cookieToken = req.cookies.get('access_token')?.value ?? '';
  const bearerToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const token = cookieToken || bearerToken;

  if (!token) {
    return json.unauthorized('Missing access token');
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/v1/:path*'],
};
