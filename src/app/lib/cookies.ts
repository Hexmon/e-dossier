// src/app/lib/cookies.ts
import { NextResponse, NextRequest } from 'next/server';

const ACCESS_TTL = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900); // 15m default

export function setAccessCookie(res: NextResponse, token: string) {
  res.cookies.set('access_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TTL,
  });
}

// Clear only the access cookie (no refresh cookie anymore)
export function clearAuthCookies(res: NextResponse) {
  res.cookies.set('access_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

// Optional helper for middleware/controllers
export function readAccessToken(req: NextRequest): string | null {
  const cookie = req.cookies.get('access_token')?.value;
  if (cookie) return cookie;
  const authz = req.headers.get('authorization');
  if (!authz) return null;
  const m = authz.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}
