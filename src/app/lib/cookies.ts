// src/app/lib/cookies.ts
import { NextResponse, NextRequest } from 'next/server';

// SECURITY FIX: Changed default from 100000000000 (3,170 years) to 900 (15 minutes)
const ACCESS_TTL = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900); // 15 minutes default
const IS_PROD = process.env.NODE_ENV === 'production';

export function setAccessCookie(res: NextResponse, token: string) {
  res.cookies.set('access_token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TTL,
  });
}

// Clear only the access cookie (no refresh cookie anymore)
export function clearAuthCookies(res: NextResponse) {
  res.cookies.set('access_token', '', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export function readAccessToken(req: NextRequest): string | null {
  // Prefer Authorization header if present
  const authz = req.headers.get('authorization');
  if (authz) {
    const m = authz.match(/^Bearer\s+(.+)$/i);
    if (m) return m[1];
  }
  // SECURITY FIX: Removed console.log that exposed authorization header

  // Fallback to cookie
  return req.cookies.get('access_token')?.value ?? null;
}
