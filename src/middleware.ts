// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { json } from '@/app/lib/http';

const PROTECTED_PREFIX = '/api/v1/';

// Public for any method (rare)
const PUBLIC_ANY: string[] = [
  '/api/v1/auth/login',
  '/api/v1/auth/signup',
  '/api/v1/auth/logout',   // allow clearing cookies
  '/api/v1/admin/users/check-username',
  '/api/v1/health',
];

// Public only for specific methods
const PUBLIC_BY_METHOD: Record<string, string[]> = {
  // Make ONLY GET public for appointments
  GET: [
     '/api/v1/roles',
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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();

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
