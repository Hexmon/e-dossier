import { NextResponse } from 'next/server';

/**
 * Shared security headers for API and page responses.
 *
 * These mirror the core headers configured in next.config.ts so that
 * individual routes can easily ensure consistent security headers.
 */
export const SECURITY_HEADERS: ReadonlyArray<{ key: string; value: string }> = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

/**
 * Apply SECURITY_HEADERS to a NextResponse in place.
 */
export function addSecurityHeaders<T extends NextResponse>(res: T): T {
  for (const { key, value } of SECURITY_HEADERS) {
    res.headers.set(key, value);
  }
  return res;
}

