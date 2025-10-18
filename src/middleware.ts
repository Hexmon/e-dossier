import { NextRequest, NextResponse } from 'next/server';
import { json } from '@/app/lib/http'; // UPDATED: use central helpers for consistent envelopes

const PROTECTED_PREFIX = '/api/v1/';

// Public endpoints (no auth required)
const PUBLIC_PATHS: string[] = [
  '/api/v1/auth/login',
  '/api/v1/auth/signup',
  '/api/v1/auth/logout',          // keep public so logout can clear cookies even if expired
  '/api/v1/users/check-username',
  '/api/v1/health',
];

function isPublicPath(pathname: string) {
  if (!pathname.startsWith(PROTECTED_PREFIX)) return true; // only guard v1 routes
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip non-API or public v1 routes
  if (isPublicPath(pathname)) return NextResponse.next();

  // (Your existing exception) Allow GET platoons without auth
  if (
    req.method === 'GET' &&
    (pathname === '/api/v1/admin/positions' || pathname.startsWith('/api/v1/admin/positions/'))
  ) {
    return NextResponse.next();
  }

  // Light gate: require token presence (verify inside the route)
  const cookieToken = req.cookies.get('access_token')?.value ?? '';
  const bearerToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const token = cookieToken || bearerToken;

  if (!token) {
    // UPDATED: return unified 401 body with status field + WWW-Authenticate header
    return json.unauthorized('Missing access token'); // UPDATED
  }

  // Token present → let the route verify & authorize (PEP-2)
  return NextResponse.next();
}

// Limit to API v1 only (perf)
export const config = {
  matcher: ['/api/v1/:path*'],
};
