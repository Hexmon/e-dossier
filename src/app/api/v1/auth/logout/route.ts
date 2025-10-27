// src/app/api/v1/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { json, handleApiError } from '@/app/lib/http';
import { clearAuthCookies } from '@/app/lib/cookies';

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
 * - Same-origin check (defense-in-depth; CSRF also enforced in middleware)
 * - Clears httpOnly access cookie
 * - Sends strict no-cache headers
 * - Uses Clear-Site-Data to wipe cookies & storage for this origin
 * - Returns 204 No Content
 */
export async function POST(req: NextRequest) {
  try {
    if (!originMatches(req)) {
      return json.forbidden('Cross-site request not allowed for logout.');
    }

    // Prepare a 204 response with safe headers
    const res = json.noContent({
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
        // Clears cookies + local/session storage for this origin
        'Clear-Site-Data': '"cookies","storage"',
      },
    });

    // Server-authoritative cookie clear
    clearAuthCookies(res);

    return res;
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * OPTIONS preflight — no CORS advertised; keeps caches off.
 */
export async function OPTIONS() {
  try {
    return NextResponse.json(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
      // Keep envelope consistent even on unexpected failures
      return json.serverError('Unexpected error handling OPTIONS');
  }
}
