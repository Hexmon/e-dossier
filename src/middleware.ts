import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessJWT } from './app/lib/jwt';

const PUBLIC = new Set(['/api/login', '/api/refresh', '/api/logout', '/api/health']);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/api')) return NextResponse.next();
  if (PUBLIC.has(pathname)) return NextResponse.next();

  const token = req.cookies.get('access_token')?.value
    ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const payload = await verifyAccessJWT(token);
    // Optionally forward identity to downstream handlers
    const headers = new Headers(req.headers);
    headers.set('x-user-id', payload.sub ?? '');
    headers.set('x-user-roles', (payload.roles ?? []).join(','));

    return NextResponse.next({ request: { headers } });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export const config = { matcher: ['/api/:path*'] };
