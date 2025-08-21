// src/app/api/sessions/revoke-all/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../db/client';
import { refreshTokens } from '../../../db/schema/auth/tokens';
import { eq } from 'drizzle-orm';
import { verifyAccessJWT } from '../../../lib/jwt';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('access_token')?.value
    ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let sub: string | undefined;
  try { sub = (await verifyAccessJWT(token)).sub ?? undefined; } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.userId, sub!));
  return NextResponse.json({ ok: true });
}
