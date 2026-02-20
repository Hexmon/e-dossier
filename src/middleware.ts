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
import { isRateLimitEnabled, shouldExcludeHealthCheck } from '@/config/ratelimit.config';
// NOTE: Cannot import audit-log in middleware (Edge Runtime doesn't support database operations)
// Audit logging for middleware events should be done in API routes instead

const PROTECTED_PREFIX = '/api/v1/';
const DASHBOARD_PREFIX = '/dashboard';

// Public for any method (rare)
const PUBLIC_ANY: string[] = [
  '/api/v1/auth/login',
  '/api/v1/auth/signup',
  '/api/v1/auth/logout',   // allow clearing cookies
  '/api/v1/admin/users/check-username',
  '/api/v1/health',
  '/api/v1/bootstrap/super-admin'
];

// Public only for specific methods
const PUBLIC_BY_METHOD: Record<string, string[]> = {
  // Make ONLY GET public for appointments
  GET: [
    //  '/api/v1/roles',
    '/api/v1/admin/appointments',
    '/api/v1/admin/positions',
    '/api/v1/platoons',
    '/api/v1/site-settings',
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

function isDashboardPath(pathname: string) {
  return pathname === DASHBOARD_PREFIX || pathname.startsWith(`${DASHBOARD_PREFIX}/`);
}

function applyNoStoreHeaders(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

export function shouldSkipRateLimit(pathname: string, method: string) {
  if (method !== 'POST' && method !== 'OPTIONS') return false;
  return matchPrefix(pathname, '/api/v1/auth/logout');
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();
  const requestHeaders = new Headers(req.headers);
  const requestId = requestHeaders.get('x-request-id') ?? crypto.randomUUID();
  requestHeaders.set('x-request-id', requestId);

  const attachRequestId = (response: NextResponse) => {
    response.headers.set('x-request-id', requestId);
    return response;
  };

  if (isDashboardPath(pathname)) {
    const token = req.cookies.get('access_token')?.value ?? '';
    if (!token) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.search = '';
      const nextPath = `${pathname}${req.nextUrl.search}`;
      if (nextPath) {
        loginUrl.searchParams.set('next', nextPath);
      }
      return attachRequestId(applyNoStoreHeaders(NextResponse.redirect(loginUrl)));
    }

    return attachRequestId(
      applyNoStoreHeaders(NextResponse.next({ request: { headers: requestHeaders } }))
    );
  }

  // SECURITY FIX: Rate Limiting for API requests
  // Apply rate limiting to all API endpoints (unless disabled in config)
  const isHealthCheck = pathname === '/api/v1/health';
  const shouldApplyRateLimit =
    isRateLimitEnabled() &&
    !(isHealthCheck && shouldExcludeHealthCheck()) &&
    !shouldSkipRateLimit(pathname, method);

  if (pathname.startsWith(PROTECTED_PREFIX) && shouldApplyRateLimit) {
    const clientIp = getClientIp(req);
    const rateLimitResult = await checkApiRateLimit(clientIp);

    // Add rate limit headers to response
    const headers = getRateLimitHeaders(rateLimitResult as any);

    if (!rateLimitResult.success) {
      // NOTE: Audit logging moved to API routes (Edge Runtime limitation)
      // Rate limit exceeded
      return attachRequestId(new NextResponse(
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
      ));
    }
  }

  // SECURITY FIX: CSRF Protection for state-changing requests
  // Generate CSRF token for GET requests (safe methods)
  if (method === 'GET' && pathname.startsWith(PROTECTED_PREFIX)) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    const csrfToken = await generateCsrfToken();
    setCsrfCookie(response, csrfToken);
    return attachRequestId(response);
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
      '/api/v1/bootstrap/super-admin',
    ];
    const shouldSkipCsrf = skipCsrfPaths.some((p) => matchPrefix(pathname, p));

    if (!shouldSkipCsrf && !(await validateCsrfToken(req))) {
      // NOTE: Audit logging moved to API routes (Edge Runtime limitation)
      return attachRequestId(json.forbidden('Invalid or missing CSRF token'));
    }
  }

  if (isPublic(pathname, method)) return NextResponse.next();

  // Light gate: token required for protected routes
  const cookieToken = req.cookies.get('access_token')?.value ?? '';
  const bearerToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const token = cookieToken || bearerToken;

  if (!token) {
    return attachRequestId(json.unauthorized('Missing access token'));
  }

  return attachRequestId(NextResponse.next({ request: { headers: requestHeaders } }));
}

export const config = {
  matcher: ['/api/v1/:path*', '/dashboard', '/dashboard/:path*'],
};
