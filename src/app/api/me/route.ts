// src\app\api\me\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessJWT } from '../../lib/jwt';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('access_token')?.value
    ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const payload = await verifyAccessJWT(token);
    return NextResponse.json({ sub: payload.sub, roles: payload.roles ?? [] });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
