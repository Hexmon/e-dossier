import { NextResponse } from 'next/server';

const ACCESS_TTL = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 600);
const REFRESH_TTL = Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 60 * 60 * 24 * 30);

export function setAccessCookie(res: NextResponse, token: string) {
  res.cookies.set('access_token', token, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/',
    maxAge: ACCESS_TTL,
  });
}

export function setRefreshCookie(res: NextResponse, token: string) {
  res.cookies.set('refresh_token', token, {
    httpOnly: true, secure: true, sameSite: 'strict', path: '/api/refresh',
    maxAge: REFRESH_TTL,
  });
}

export function clearAuthCookies(res: NextResponse) {
  res.cookies.set('access_token', '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
  res.cookies.set('refresh_token', '', { httpOnly: true, secure: true, sameSite: 'strict', path: '/api/refresh', maxAge: 0 });
}
